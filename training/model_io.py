import os
import tensorflow as tf
from tensorflow.python.keras.models import (
    load_model,
    model_from_yaml
)


def save_model(folder, model, tag=None):
    if not os.path.isdir(folder):
        os.makedirs(folder)
    naming = 'model_%s' % str(tag) if tag is not None else 'model'
    model_yaml = os.path.join(folder, "%s.yaml" % naming)
    with open(model_yaml, "w") as yaml_file:
        yaml_file.write(model.to_yaml())
    print('Model saved to %s' % folder)


def _load_model(folder, model, weights_only=True):
    latest = os.path.join(folder, "latest")
    if model is None and weights_only:
        with open(os.path.join(folder, 'model.yaml'), 'r') as yaml_file:
            loaded_model_yaml = yaml_file.read()
        model = model_from_yaml(loaded_model_yaml, custom_objects={'tf': tf})
        print('Model loaded from %s' % os.path.join(folder, 'model.yaml'))
    if os.path.isfile(latest):
        with open(latest, 'r') as f:
            filename = f.readlines()[0]
        epoch = filename.split('_')[1]
        # If model and weights were stored separately
        if weights_only:
            try:
                model.load_weights(os.path.join(folder, '%s.h5' % filename))
            except:
                print('Single gpu loading failed, try with multi-gpu loading...')
                from tensorflow.python.keras.utils import multi_gpu_model
                multi_model = multi_gpu_model(model, gpus=len(os.environ["CUDA_VISIBLE_DEVICES"].split(',')) - 1)
                multi_model.load_weights(os.path.join(folder, '%s.h5' % filename))
                model = multi_model.layers[-2]
            print('Weights loaded from %s' % os.path.join(folder, '%s.h5' % filename))
        elif not weights_only:
            model = load_model(os.path.join(folder, '%s.h5' % filename), compile=False)
            print('Model loaded from %s' % os.path.join(folder, '%s.h5' % filename))
        return model, int(epoch)
    return model, 0
