# Fundus Grading Platform

This is an product-ready application for grading fundus photos using Angular and Flask. Deep learning models were trained with MobileNet and DenseNet in Keras and compressed with Tensorflow Lite.

The application aims for a desktop use or data server use to avoid cloud computation cost. It therefore heavily used the file system by the Flask backend.

Sample Images can be found from [EyePACS dataset](https://www.kaggle.com/c/diabetic-retinopathy-detection).

## Project Structure.

- app
    - frontend -- The Angular frontend.
    - fundus_sample -- The sample images for lazy users to have a quick test.
    - models -- Pre-trained and compressed Tensorflow Lite models.
    - index.py -- Python Flask backend.


## Requirements.
- For Python:
    Note: Tensorflow has to be 1.14 above. It is recommended to use 2.0 as it is the development environment.
    ```bash
    $ pip install flask, flask_cors, tensorflow, scikit-image
    ```
- For Node:
    ```bash
    $ cd frontend
    $ npm install
    ```
Note: <b>If using self-provided fundus photos, you must provide a .csv file with a column named 'filepath'.</b>

## Screenshot

![screenshot](./imgs/sc.png)
