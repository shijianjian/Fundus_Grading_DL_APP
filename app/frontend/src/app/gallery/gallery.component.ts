import { Component, ViewChild } from '@angular/core';
import { CSVService } from './csv.service';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryComponent {

  constructor(private csvService: CSVService, private http: HttpClient) { }

  public records: any[] = [];  
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
        this.csvService.sendCSV(this.records, headersRow);
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
    this.http.get('http://127.0.0.1:5000/image/load_samples').pipe(take(1)).subscribe((data) => {
      data['samples'].forEach((val, idx, arr) => {
        x.push({'filepath': val});
      })
      this.csvService.sendCSV(x, ['filepath']);
    });
  }

  upload(event) {
    let f: File = event.srcElement.files[0];
    const formData = new FormData();
    formData.append('file', f);
    this.http.post('http://127.0.0.1:5000/image/upload', formData).subscribe(data => {
      let current_csv;
      let current_header;
      let res = this.csvService.getCSV();
      if (res.length == 0) {
        current_csv = [];
        current_header= [];
      } else {
        current_csv = res['csv'];
        current_header= res['header'];
      }
      if (!current_header.includes('filepath')) {
        current_header = ['filepath'].concat(current_header);
      }
      if (!current_header.includes('__data_uploaded_tag__')) {
        current_header = ['__data_uploaded_tag__'].concat(current_header);
      }
      current_csv = [{'filepath': data['path'], '__data_uploaded_tag__': true}].concat(current_csv);
      localStorage.setItem(data['path'], data['image']);
      this.csvService.sendCSV(current_csv, current_header);
    });
  }
}
