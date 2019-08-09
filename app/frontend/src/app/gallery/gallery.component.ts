import { Component, ViewChild } from '@angular/core';
import { CSVService } from './csv.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryComponent {

  constructor(private csvService: CSVService) { }

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
    let x = [
      {
        'filepath': '/raid/datasets/Harmy/HD/fundus/HD035/Y1^2012-03-28/SW00)-HZ.009.JPG'
      },
      {
        'filepath': '/raid/datasets/ARED/fundus/ARED021/M00/ARED021_20170629_164712_Color_R_001.tif'
      },
      {
        'filepath': '/raid/datasets/Harmy/HD/fundus/HD004/Y2^2012-08-31/SH00)2NZ.006.JPG'
      },
    ]
    this.csvService.sendCSV(x, ['filepath']);
  }

}
