from model_io import save_model, _load_model
from callbacks import (
    lr_scheduler,
    single_class_accuracy,
    Profiler,
    AdditionalValidationSets
)

import tensorflow.keras.backend as K
from tensorflow.python.keras.metrics import categorical_accuracy
from tensorflow.python.keras.callbacks import (
    ModelCheckpoint,
    LearningRateScheduler,
    CSVLogger,
    TensorBoard
)

import tensorflow as tf
import numpy as np
import pandas as pd
import os


folder = "./vgg-site_tagging"
train_directory = None
test_directory = None
parent_folder = ''

if folder is None:
    folder = 'transfer_learning'
    from datetime import datetime
    folder += '-' + datetime.now().strftime("%Y%m%d")
folder = os.path.join(parent_folder, folder)
logger = os.path.join(folder, 'training.log')


if __name__ == '__main__':

    import os
    import argparse
    os.environ["CUDA_VISIBLE_DEVICES"] = '2'
    os.environ["CUDA_DEVICE_ORDER"] = 'PCI_BUS_ID'
    os.environ['KERAS_BACKEND'] = 'tensorflow'

    config = tf.ConfigProto()
    config.gpu_options.allow_growth = True  # dynamically grow the memory used on the GPU
    # config.log_device_placement = True  # to log device placement (on which device the operation ran)
    sess = tf.Session(config=config)
    K.set_session(sess)  # set this TensorFlow session as the default session for Keras

    parser = argparse.ArgumentParser(description="")
    parser.add_argument('--testing', action='store_true')
    parser.add_argument('--predict', action='store_true')
    args = parser.parse_args()

    if args.testing:
        mode = 'testing'
    elif args.predict:
        mode = 'predict'
    else:
        mode = 'training'

    if os.path.exists(folder) and os.path.exists(os.path.join(folder, 'model.yaml')):
        model, epoch = _load_model(folder, None, weights_only=True)
    else:
        from tensorflow.python.keras.layers import *
        from tensorflow.python.keras.models import Model
        from tensorflow.python.keras.regularizers import l2
        input_a = Input(shape=(224, 224, 3))
        x = tf.keras.applications.VGG16(include_top=False, weights='imagenet', input_tensor=input_a, pooling='avg').outputs[0]
        x = Dropout(0.3)(x)
        x = Dense(units=2,
                  name='site_classifier',
                  kernel_initializer="he_normal",
                  kernel_regularizer=l2(1e-4),
                  activation='softmax')(x)
        model = Model(inputs=input_a, outputs=x)
        model, epoch = _load_model(folder, model, weights_only=True)
        save_model(folder, model)
    print('Model built successfully.')

    if not os.path.isdir(folder):
        os.makedirs(folder)
    log_append = True if os.path.isfile(logger) else False
    print(model.summary())

    from tensorflow.python.keras.preprocessing.image import ImageDataGenerator
    train_datagen = ImageDataGenerator(
        featurewise_center=True,
        featurewise_std_normalization=True,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        brightness_range=(0.8, 1.2),
        zoom_range=0.1,
        horizontal_flip=False,
        vertical_flip=True,
        fill_mode='constant'
    )
    test_datagen = ImageDataGenerator()

    if os.path.exists(folder) and os.path.exists(os.path.join(folder, 'train.csv')) and os.path.exists(os.path.join(folder, 'test.csv')):
        train = pd.read_csv(os.path.join(folder, 'train.csv'))
        test = pd.read_csv(os.path.join(folder, 'test.csv'))
    else:
        base = './data_sheets/'
        csvs = []
        for f in [f for f in os.listdir(base) if f.endswith('.csv')]:
            csv = pd.read_csv(os.path.join(base, f))
            csv = csv[csv['gradability'] == 'Y'].dropna()
            print(f, csv.groupby(['site', 'area']).count()['filename'])
            csvs.append(csv)
        csvs = pd.concat(csvs).reset_index(drop=True)
        csvs = csvs[csvs['area'] != 'Other']
        csvs = csvs[['filename', 'root', 'pid', 'area', 'site', 'gradability']]
        csvs['filepath'] = csvs['root'] + os.path.sep + csvs['filename']
        csvs['study'] = csvs['pid'].str[:2]

        test = csvs.groupby(['study']).apply(lambda x: x.sample(50, replace=True)).reset_index(level=0, drop=True)
        train = csvs.drop(list(test.index))
        # train['tagging'] = train['site'] + ',' + train['area']
        # print(train['tagging'].unique())
        # train["tagging"] = train["tagging"].apply(lambda x: x.split(","))
        train.to_csv(os.path.join(folder, 'train.csv'), index=None)
        # test['tagging'] = test['site'] + ',' + test['area']
        # print(test['tagging'].unique())
        # test["tagging"] = test["tagging"].apply(lambda x: x.split(","))
        test.to_csv(os.path.join(folder, 'test.csv'), index=None)

    train_generator = train_datagen.flow_from_dataframe(
        train,
        target_size=(224, 224),
        x_col='filepath',
        directory=train_directory,
        y_col='site',
        color_mode="rgb",
        batch_size=32,
        class_mode="categorical",
        shuffle=True,
        seed=42,
        drop_duplicates=False,
    )

    test_generator = test_datagen.flow_from_dataframe(
        test,
        target_size=(224, 224),
        directory=test_directory,
        x_col='filepath',
        y_col='site',
        color_mode="rgb",
        batch_size=32,
        class_mode="categorical",
        shuffle=False,
        seed=42
    )

    if mode == 'training':

        from tensorflow.python.keras.optimizers import Adam
        from tensorflow.python.keras.losses import categorical_crossentropy

        adam = Adam(lr=0.0)
        metrics = ['accuracy']

        model.compile(optimizer=adam, metrics=metrics, loss=categorical_crossentropy)

        model.fit_generator(
            train_generator,
            validation_data=test_generator,
            epochs=100,
            use_multiprocessing=False,
            workers=10,
            callbacks=[
                ModelCheckpoint(
                    '%s/model_{epoch:d}_loss{loss:.4f}_acc_{acc:.4f}.h5' % folder,
                    monitor='val_loss',
                    verbose=1,
                    save_best_only=False,
                    save_weights_only=True,
                    mode='auto',
                    period=1),
                CSVLogger(logger, append=log_append),
                lr_scheduler(initial_lr=3e-4, decay_factor=0.75, step_size=5, min_lr=1e-8)
            ],
            max_queue_size=30,
        )
    elif mode == 'testing':
        adam = tf.train.AdamOptimizer(learning_rate=1e-3)
        model.compile(loss="categorical_crossentropy", optimizer=adam, metrics=['accuracy'])

        res = model.evaluate_generator(
            test_sequence,
            verbose=1
        )
        print(model.metrics_names)
        print(res)
    elif mode == 'predict':
        pass
    else:
        raise ValueError('')
