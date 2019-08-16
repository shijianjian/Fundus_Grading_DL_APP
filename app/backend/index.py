from flask import Flask, escape, request, json, url_for, send_from_directory
from flask_cors import CORS
import tensorflow as tf
from skimage.transform import resize
import matplotlib.pyplot as plt
import os
import numpy as np
import time
import urllib
import base64
import io
from PIL import Image

app = Flask(__name__, static_folder='dist/frontend')
CORS(app)

base_dir = os.path.dirname(__file__)


fundus_sample_path = os.path.join(base_dir, 'fundus_samples')

models = {
    'area_tagging': {
        'path': os.path.join(base_dir, 'models', 'area_tflite_model-epoch_21.tflite'),
        'class_indicies': {0: 'Disc', 1: 'Macular'}
    },
    'site_tagging': {
        'path': os.path.join(base_dir, 'models', 'site_tflite_model-epoch_39.tflite'),
        'class_indicies': {0: 'L', 1: 'R'}
    },
    'gradability': {
        'path': os.path.join(base_dir, 'models', 'gradability_converted_tflite_model.tflite'),
        'class_indicies': {0: 'Ungradable', 1: 'Gradable'}
    }
}


def load_model(model_json):
    interpreter = tf.lite.Interpreter(model_path=model_json['path'])
    return interpreter


loaded_models = {}

for model in models.keys():
    loaded_models.update({model: load_model(models[model])})


@app.route('/')
def serve_frontend():
    return send_from_directory('dist/frontend', 'index.html')


def inference(interpreter, x):
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    for i in range(len(input_details)):
        interpreter.set_tensor(input_details[i]['index'], x[i])
    interpreter.invoke()
    outputs = []
    for i in range(len(output_details)):
        outputs.append(interpreter.get_tensor(output_details[i]['index']).tolist())
    return outputs


@app.route("/<model>/input_details", methods=['GET'])
def get_input_details(model):
    x = loaded_models[model].get_input_details()
    for i in range(len(x)):
        x[i]['shape'] = x[i]['shape'].tolist()
        x[i]['dtype'] = x[i]['dtype'].__name__
    return app.response_class(
        response=json.dumps(x),
        status=200,
        mimetype='application/json'
    )


@app.route("/<model>/output_details", methods=['GET'])
def get_output_details(model):
    x = loaded_models[model].get_output_details()
    for i in range(len(x)):
        x[i]['shape'] = x[i]['shape'].tolist()
        x[i]['dtype'] = x[i]['dtype'].__name__
    return app.response_class(
        response=json.dumps(x),
        status=200,
        mimetype='application/json'
    )


def img_preprocessing(img_path):
    img = plt.imread(img_path)
    return resize(img, (224, 224), mode='constant') * 255


@app.route("/<model>/predict", methods=['POST'])
def predict(model):
    data = request.data
    print(data)
    inference(loaded_models[model], data)
    for i in range(len(x)):
        x[i]['shape'] = x[i]['shape'].tolist()
        x[i]['dtype'] = x[i]['dtype'].__name__
    return app.response_class(
        response=json.dumps(x),
        status=200,
        mimetype='application/json'
    )


@app.route("/<model>/predict/local", methods=['GET'])
def predict_local(model):
    path = urllib.parse.unquote(request.args.get('path'))
    image = img_preprocessing(path)
    start = time.process_time()
    out = inference(loaded_models[model], [np.array([image]).astype(np.float32)])
    res = models[model]['class_indicies'][np.argmax(out[0])]
    return app.response_class(
        response=json.dumps({
            'preds': out,
            'class_indicies': models[model]['class_indicies'],
            'time_elapsed': time.process_time() - start,
            'results': res
        }),
        status=200,
        mimetype='application/json'
    )


@app.route("/<model>/predict/upload", methods=['POST'])
def predict_upload(model):
    image_base64 = base64.b64decode(request.form['image'])
    image = Image.open(io.BytesIO(image_base64))
    image = resize(np.array(image), (224, 224), mode='constant') * 255
    start = time.process_time()
    out = inference(loaded_models[model], [np.array([image]).astype(np.float32)])
    res = models[model]['class_indicies'][np.argmax(out[0])]
    return app.response_class(
        response=json.dumps({
            'preds': out,
            'class_indicies': models[model]['class_indicies'],
            'time_elapsed': time.process_time() - start,
            'results': res
        }),
        status=200,
        mimetype='application/json'
    )


@app.route("/image/load_samples", methods=['GET'])
def load_samples():
    samples = list([os.path.abspath(os.path.join(fundus_sample_path, p)) for p in os.listdir(fundus_sample_path)])
    return app.response_class(
        response=json.dumps({'samples': samples}),
        status=200,
        mimetype='application/json'
    )


@app.route("/image/upload", methods=['POST'])
def upload_image():
    f = request.files['file']
    filename = f.filename
    # Convert image to JPEG and store it on frontend, keep the backend stateless.
    if filename.endswith('.tif') or filename.endswith('.tiff'):
        img = Image.open(io.BytesIO(f.read()))
        buffer = io.BytesIO()
        img.save(buffer, "JPEG")
        content = buffer.getvalue()
        base64_image = base64.b64encode(content).decode('UTF-8')
    else:
        base64_image = base64.b64encode(f.read()).decode('UTF-8')
    return app.response_class(
        response=json.dumps({'path': filename, 'image': base64_image}),
        status=200,
        mimetype='application/json'
    )


@app.route("/image/local", methods=['GET'])
def return_image():
    path = urllib.parse.unquote(request.args.get('path'))
    if path.endswith('.tif') or path.endswith('.tiff'):
        img = Image.open(path)
        buffer = io.BytesIO()
        img.save(buffer, "JPEG")
        content = buffer.getvalue()
        base64_image = base64.b64encode(content).decode('UTF-8')
    else:
        with open(path, 'rb') as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('UTF-8')
    return app.response_class(
        response=json.dumps({'image': base64_image}),
        status=200,
        mimetype='application/json'
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0')
