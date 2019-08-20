import webview
from waitress import serve
import threading
import logging
from time import sleep

from index import app


logger = logging.getLogger(__name__)


def url_ok(url, port):
    # Use httplib on Python 2
    try:
        from http.client import HTTPConnection
    except ImportError:
        from httplib import HTTPConnection

    try:
        conn = HTTPConnection(url, port)
        conn.request('GET', '/')
        r = conn.getresponse()
        return r.status == 200
    except:
        logger.exception('Server not started')
        return False


if __name__ == '__main__':
    t = threading.Thread(target=lambda: serve(app, host='127.0.0.1', port=5000))
    t.daemon = True
    t.start()
    logging.debug("Checking server...")

    while not url_ok('127.0.0.1', 5000):
        sleep(0.3)
    logging.debug("Server started.")
    webview.create_window('Fundus Grading App', 'http://127.0.0.1:5000', width=1024, height=768)
    webview.start()
