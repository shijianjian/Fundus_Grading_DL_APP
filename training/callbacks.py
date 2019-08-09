from sklearn.metrics import roc_auc_score, confusion_matrix
from tensorflow.python.keras.callbacks import (
    Callback,
    LearningRateScheduler,
)
import tensorflow as tf
from tensorflow.python.keras import backend as K
import numpy as np
import os


def single_class_accuracy(interested_class_id):
    def f(y_true, y_pred):
        class_id_true = K.argmax(y_true, axis=-1)
        class_id_preds = K.argmax(y_pred, axis=-1)
        # Replace class_id_preds with class_id_true for recall here
        accuracy_mask = K.cast(K.equal(class_id_preds, interested_class_id), 'int32')
        class_acc_tensor = K.cast(K.equal(class_id_true, class_id_preds), 'int32') * accuracy_mask
        class_acc = K.sum(class_acc_tensor) / K.maximum(K.sum(accuracy_mask), 1)
        return class_acc
    import types
    name = 'accuracy_for_%d' % interested_class_id
    return types.FunctionType(f.__code__, f.__globals__, name, f.__defaults__, f.__closure__)


def lr_scheduler(initial_lr=1e-3, decay_factor=0.75, step_size=5, min_lr=1e-5):
    '''
    Wrapper function to create a LearningRateScheduler with step decay schedule.
    '''
    def schedule(epoch):
        lr = initial_lr * (decay_factor ** np.floor(epoch / step_size))
        if lr > min_lr:
            return lr
        return min_lr

    return LearningRateScheduler(schedule, verbose=1)


# class Histories(Callback):

#     def __init__(self, dataloader, label_column=None):
#         self.dataloader = dataloader
#         self.label_column = label_column

#     def on_train_begin(self, logs={}):
#         self.aucs = []
#         self.losses = []

#     def on_train_end(self, logs={}):
#         return

#     def on_epoch_begin(self, epoch, logs={}):
#         return

#     def on_epoch_end(self, epoch, logs={}):
#         self.losses.append(logs.get('loss'))
#         pred_sequence = EyeBrainPredictionSequence(self.dataloader, self.validation_data.data, label_column=self.label_column)
#         y_pred = self.model.predict(pred_sequence)
#         pred = np.argmax(y_pred, -1)
#         if pred_sequence.num_classes == 2:
#             norm = [x[1] / (x[0] + x[1]) for x in y_pred]
#             self.aucs.append(roc_auc_score(pred_sequence.ground_truth, norm))
#             tn, fp, fn, tp = confusion_matrix(pred_sequence.ground_truth, pred).ravel()
#             print('AUC for epoch %d' % epoch, self.aucs[-1], 'Specificity:', tn / (tn + fp), 'Sensitivity:', tp / (tp + fn))
#             logs['val_auc'] = self.aucs[-1]
#             logs['specificity'] = tn / (tn + fp)
#             logs['sensitivity'] = tp / (tp + fn)
#         else:
#             print('AUC for %d classes is not implemented' % pred_sequence.num_classes)

#     def on_batch_begin(self, batch, logs={}):
#         return

#     def on_batch_end(self, batch, logs={}):
#         return


class Profiler(Callback):

    def __init__(self, run_metadata, folder='.'):
        self.run_metadata = run_metadata
        self.folder = folder

    def on_train_begin(self, logs={}):
        return

    def on_train_end(self, logs={}):
        return

    def on_epoch_begin(self, epoch, logs={}):
        return

    def on_epoch_end(self, epoch, logs={}):
        from tensorflow.python.client import timeline
        tl = timeline.Timeline(self.run_metadata.step_stats)
        ctf = tl.generate_chrome_trace_format()
        tracking = os.path.join(self.folder, 'timeline_epoch_%d' % epoch)
        suffix = 1
        while os.path.isfile(tracking + '.json'):
            tracking += '_%d' % suffix
            suffix += 1
        with open(tracking + '.json', 'w') as f:
            f.write(ctf)

    def on_batch_begin(self, batch, logs={}):
        return

    def on_batch_end(self, batch, logs={}):
        return


class AdditionalValidationSets(Callback):
    def __init__(self, validation_sets, verbose=1):
        """
        :param validation_sets:
        a list of 3-tuples (validation_data, validation_targets, validation_set_name)
        or 4-tuples (validation_data, validation_targets, sample_weights, validation_set_name)
        :param verbose:
        verbosity mode, 1 or 0
        :param batch_size:
        batch size to be used when evaluating on the additional datasets
        """
        super(AdditionalValidationSets, self).__init__()
        self.validation_sets = validation_sets
        for validation_set in self.validation_sets:
            if len(validation_set) not in [2, 3]:
                raise ValueError()
        self.epoch = []
        self.history = {}
        self.verbose = verbose

    def on_train_begin(self, logs=None):
        self.epoch = []
        self.history = {}

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        self.epoch.append(epoch)

        # record the same values as History() as well
        for k, v in logs.items():
            self.history.setdefault(k, []).append(v)

        # evaluate on the additional validation sets
        for validation_set in self.validation_sets:
            validation_data, validation_set_name = validation_set
            print('\nEvaluating:', validation_set_name)
            results = self.model.evaluate_generator(validation_data, verbose=self.verbose)

            for i, result in enumerate(results):
                if i == 0:
                    valuename = validation_set_name + '_loss'
                else:
                    valuename = validation_set_name + '_' + self.model.metrics_names[i - 1]
                self.history.setdefault(valuename, []).append(result)
                logs[valuename] = result
