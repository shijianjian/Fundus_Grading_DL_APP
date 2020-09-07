import { Component, ViewChild, OnInit } from '@angular/core';
import { CSVService } from './csv.service';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { FileUploadControl, FileUploadValidators } from '@iplab/ngx-file-upload';
import * as UTIF from 'utif';

import { flask_config, environment } from 'src/environments/environment'


@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit {

  public uploadedFiles: Array<File> = [];

  constructor(private csvService: CSVService, private http: HttpClient) { }

  ngOnInit() {
    this.loadFromLocalStorage();
  }

  public filesControl = new FileUploadControl().setListVisibility(false);
  
  env = environment;
  public records: any[] = [];
  highlight_index: number;
  @ViewChild('csvReader') csvReader: any;  
  
  uploadListener($event: any): void {  
  
    let text = [];  
    let files = $event.srcElement.files;
    console.log($event)
  
    if (this.isValidCSVFile(files[0])) {  
  
      let input = $event.target;  
      let reader = new FileReader();  
      reader.readAsText(input.files[0]);  
  
      reader.onload = () => {  
        let csvData = reader.result;  
        let csvRecordsArray = (<string>csvData).split(/\r\n|\n/);  
        let headersRow = this.getHeaderArray(csvRecordsArray);
        if (!headersRow.includes('filepath')) {
          alert("No column named 'filepath'. Inference will not be runnable.")
        }
        this.records = this.getDataRecordsArrayFromCSVFile(csvRecordsArray, headersRow);
        this.csvService.sendCSV({csv: this.records, header: headersRow});
      };
  
      reader.onerror = function () {  
        console.log('error is occured while reading file!');  
      };  
  
    } else {  
      alert("Please import valid .csv file.");  
      this.fileReset();  
    }  
  }  
  
  getDataRecordsArrayFromCSVFile(csvRecordsArray: any, headers: any) {  
    let csvArr = [];  
  
    for (let i = 1; i < csvRecordsArray.length; i++) {  
      let curruntRecord = (<string>csvRecordsArray[i]).split(',');
      let record = {}
      curruntRecord.forEach((value, idx, arr) => {
        record[headers[idx]] = value
      })
      csvArr.push(record);
    }  
    return csvArr;  
  }  
  
  isValidCSVFile(file: any) {
    return file.name.endsWith(".csv");  
  }  
  
  getHeaderArray(csvRecordsArr: any) {  
    let headers = (<string>csvRecordsArr[0]).split(',');  
    let headerArray = [];  
    for (let j = 0; j < headers.length; j++) {  
      headerArray.push(headers[j]);  
    }  
    return headerArray;  
  }  
  
  fileReset() {
    this.csvReader.nativeElement.value = "";  
    this.records = [];  
  }

  loadSamples() {
    let x = [];
    this.http.get(`${flask_config.backend_url}/image/load_samples`).pipe(take(1)).subscribe((data) => {
      data['samples'].forEach((val, idx, arr) => {
        x.push({'filepath': val});
      })
      let current_csv = this.csvService.getCSV();
      let new_csv = current_csv.csv.concat(x);
      this.csvService.sendCSV({csv: new_csv, header: current_csv.header});
    });
  }

  loadFromLocalStorage() {
    let x = [];
    Object.keys(localStorage).forEach((key) => {
      let obj = JSON.parse(localStorage.getItem(key));
      x.push({
        'filepath': key,
        'base64_src': obj['base64_src'],
        'pred_gradability': obj['pred_gradability'],
        'pred_area': obj['pred_area'],
        'pred_site': obj['pred_site'],
        '__data_uploaded_tag__': obj['__data_uploaded_tag__']
      });
    });
    this.csvService.sendCSV({csv: x, header: ['filepath', 'pred_gradability', 'pred_area', 'pred_site']});
  }

  async auto_upload(event) {
    if (this.uploadedFiles.length > 0) {
      // Avoid dynamic changes
      let length_total = this.uploadedFiles.length
      for (let i = 0; i < length_total; i ++) {
        // It is not a bug, it will always upload the first then delete it from the list
        await this._upload_one(this.uploadedFiles[0])
        this.filesControl.removeFile(this.uploadedFiles[0])
      }
    }
  }

  async upload(event) {
    let fs: FileList = event.srcElement.files;
    for (let i = 0; i < fs.length; i ++) {
      await this._upload_one(fs.item(i))
    }
  }

  async _upload_one(f: File) {
    this.highlight_index = undefined;
    let resizedImage: Blob
    try {
      resizedImage = await resizeImage({
          file: f,
          maxSize: 400
      });
    } catch (err) {
      alert(`${f.name} is not an image.`);
      this.filesControl.removeFile(f);
      return
    }
    f = new File([resizedImage], f.name)
    const formData = new FormData();
    formData.append('file', f);
    let res = this.csvService.getCSV();
    let current_csv: any[];
    let current_header: string[];
    if (res.csv.length == 0) {
      current_csv = [];
      current_header= [];
    } else {
      current_csv = res['csv'];
      current_header= res['header'];
    }
    let exists = -1;
    // Duplication check
    () => {
      current_csv.every((val, idx, arr) => {
        if (val['filepath'] == f.name) {
          exists = idx;
          return false;
        }
        return true;
      });
      if (exists != -1) {
        alert(`Duplicated filepath on index ${exists}`);
        this.highlight_index = exists;
        return
      }
    }
    this.http.post(`${flask_config.backend_url}/image/upload`, formData).subscribe(data => {
      if (!current_header.includes('filepath')) {
        current_header = ['filepath'].concat(current_header);
      }
      if (!current_header.includes('__data_uploaded_tag__')) {
        current_header = ['__data_uploaded_tag__'].concat(current_header);
      }
      current_csv = [{'filepath': data['path'], '__data_uploaded_tag__': true}].concat(current_csv);
      localStorage.setItem(data['path'], JSON.stringify({'base64_src': data['image'], 'base64_img_size': (data['image'].length / 4) * 3 / 1024, '__data_uploaded_tag__': true}));
      this.csvService.sendCSV({csv: current_csv, header: current_header});
    });
  }
}

interface IResizeImageOptions {
  maxSize: number;
  file: File;
}

function resizeImage(settings: IResizeImageOptions): Promise<Blob> {
  const file = settings.file;
  const maxSize = settings.maxSize;
  const reader = new FileReader();
  const image = new Image();
  const canvas = document.createElement('canvas');

  const loadTiff = (tifffile: any) => {
    var ifds = UTIF.decode(tifffile);
    UTIF.decodeImage(tifffile, ifds[0]);
    return ifds[0];
  }

  const dataURItoBlob = (dataURI: string) => {
    const bytes = dataURI.split(',')[0].indexOf('base64') >= 0 ?
        atob(dataURI.split(',')[1]) :
        unescape(dataURI.split(',')[1]);
    const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const max = bytes.length;
    const ia = new Uint8Array(max);
    for (var i = 0; i < max; i++) ia[i] = bytes.charCodeAt(i);
    return new Blob([ia], {type:mime});
  };

  const resize = () => {
    let width = image.width;
    let height = image.height;

    if (width > height) {
        if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
        }
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    let dataUrl = canvas.toDataURL('image/jpeg');
    return dataURItoBlob(dataUrl);
  };
  return new Promise((ok, no) => {
    if (!file.type.match(/image.*/)) {
      no(`${file.name} is not an image`);
      return;
    }
    reader.onload = (readerEvent: ProgressEvent) => {
      image.onload = () => ok(resize());
      if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
        var binary_string =  window.atob(readerEvent.target['result'].split(',')[1]);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        const tif_cvt = loadTiff(bytes.buffer);
        canvas.width  = tif_cvt.width;
        canvas.height = tif_cvt.height;
        let ctx = canvas.getContext('2d');
        let rgba = UTIF.toRGBA8(tif_cvt);
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);
        image.src = canvas.toDataURL('image/jpeg');
      } else {
        image.src = readerEvent.target['result'];
      }
    };
    reader.readAsDataURL(file);
  })    
}