import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import {animate, state, style, transition, trigger} from '@angular/animations';
import { CSVService } from '../csv.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTable } from '@angular/material';

import { flask_config } from 'src/environments/environment';

@Component({
  selector: 'app-gallery-list',
  templateUrl: './gallery-list.component.html',
  styleUrls: ['./gallery-list.component.css'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class GalleryListComponent implements OnInit, OnDestroy {
  dataSource = [];
  csvSubscription: Subscription;
  columnsToDisplay = [];
  docHeaders = [];
  selection = new SelectionModel<any>(true, []);
  running_progress = 0;
  running = false;
  stop = false;

  private _highlightIndex;
  get highlightIndex(): number[] {
    return this._highlightIndex;
  }
  
  @Input('highlightIndex')
  set highlightIndex(val: number[]) {
    this._highlightIndex = val;
  }

  @ViewChild('table') table: MatTable<any>;

  constructor(private csvService: CSVService, private http: HttpClient) {
    this.csvSubscription = this.csvService.getSubject().subscribe(data => {
      if (data.length == 0) {
        this.dataSource = [];
        this.docHeaders = [];
        this.columnsToDisplay = []
        return
      }
      if (data) {
        this.dataSource = data['csv'];
        this.docHeaders = data['header'];
        this.columnsToDisplay = ['select'].concat(data['header']).concat(['run']);
        // Excluding headers
        ['__data_uploaded_tag__'].forEach((val, idx, arr) => {
          if (this.columnsToDisplay.includes(val)) {
            this.columnsToDisplay.splice(this.columnsToDisplay.indexOf(val), 1);
          }
        });
        ['pred_gradability', 'pred_area', 'pred_site'].forEach((val, idx, arr) => {
          if (this.columnsToDisplay.includes(val)) {
            this.columnsToDisplay.splice(this.columnsToDisplay.indexOf(val), 1);
          }
          this.columnsToDisplay.push(val);
        });
        this.columnsToDisplay.push('_'); // Default Operation Columns, including like, delete, etc.
        this.selection.clear();
        console.debug(data);
        console.debug(this.columnsToDisplay)
      }
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.csvSubscription.unsubscribe();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.forEach((val, idx, arr) => this.selection.select(idx));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  getPrediction(idx: number): Observable<any[]> {
    if (this.dataSource[idx]['__data_uploaded_tag__'] == true) {
      const formData = new FormData();
      formData.append('image', JSON.parse(localStorage.getItem(this.dataSource[idx]['filepath']))['base64_src']);
      return this.http.post(`${flask_config.backend_url}/gradability/predict/upload`, formData).pipe(switchMap((x: any) => {
        if (x['results'] == 'Gradable') {
          return forkJoin([
            of(idx),
            of(x),
            this.http.post(`${flask_config.backend_url}/area_tagging/predict/upload`, formData),
            this.http.post(`${flask_config.backend_url}/site_tagging/predict/upload`, formData)
          ]);
        } else {
          return forkJoin([
            of(idx),
            of(x),
          ]);
        }
      }));
    } else {
      const params = new HttpParams().set('path', encodeURIComponent(this.dataSource[idx]['filepath']))
      return this.http.get(`${flask_config.backend_url}/gradability/predict/local`, {params}).pipe(switchMap((x: any) => {
        if (x['results'] == 'Gradable') {
          return forkJoin([
            of(idx),
            of(x),
            this.http.get(`${flask_config.backend_url}/area_tagging/predict/local`, {params}),
            this.http.get(`${flask_config.backend_url}/site_tagging/predict/local`, {params})
          ]);
        } else {
          return forkJoin([
            of(idx),
            of(x),
          ]);
        }
      }));
    }
  }

  addToFavorite(idx: number) {
    if (this.dataSource[idx]['favorite'] == true) {
      this.dataSource[idx]['favorite'] = false;
    } else {
      this.dataSource[idx]['favorite'] = true;
    }
  }

  removeItem(idx: number) {
    if (confirm(`You are going to remove file item ${this.dataSource[idx]['filename']}`)) {
      localStorage.removeItem(this.dataSource[idx]['filepath']);
      this.dataSource.splice(idx, 1);
      this.table.renderRows();
    }
  }

  imageLaunchListener(idx: number) {
    if (this.dataSource[idx]['base64_src'] != undefined) {
      return
    }
    this.dataSource[idx]['base64_src_loading'] = true;
    if ((localStorage.getItem(this.dataSource[idx]['filepath']) != undefined)
      && (JSON.parse(localStorage.getItem(this.dataSource[idx]['filepath']))['base64_src'] != undefined)) {
      this.dataSource[idx]['base64_src'] = JSON.parse(localStorage.getItem(this.dataSource[idx]['filepath']))['base64_src'];
      this.dataSource[idx]['base64_src_loading'] = false;
    } else {
      const params = new HttpParams().set('path', encodeURIComponent(this.dataSource[idx]['filepath']));
      this.http.get(`${flask_config.backend_url}/image/local`, {params}).pipe(take(1)).subscribe(image => {
        this.dataSource[idx]['base64_src'] = image['image'];
        this.dataSource[idx]['base64_src_loading'] = false;
        this.updateLocalStorage(this.dataSource[idx]['filepath'], {'base64_src': image['image']});
      });
    }
  }

  async sendToPrediction(idx) {
    this.dataSource[idx]['running'] = true
    return await this.getPrediction(idx).pipe(take(1)).toPromise().then(
      (data: any[]) => {
        this.dataSource[data[0]]['pred_gradability'] = data[1]['results'];
        if (data.length != 2) {
          this.dataSource[data[0]]['pred_area'] = data[2]['results'];
          this.dataSource[data[0]]['pred_site'] = data[3]['results'];
        }
        this.dataSource[data[0]]['running'] = false
        this.updateLocalStorage(this.dataSource[idx]['filepath'], {
          'pred_gradability': data[1]['results'],
          'pred_area': data[2]['results'],
          'pred_site': data[3]['results'],
        });
      },
      error => {
        console.log(error);
      }
    );
  }

  updateLocalStorage(key: string, val: {}) {
    if (localStorage.getItem(key) != undefined) {
      let current_val: string = localStorage.getItem(key);
      current_val = Object.assign(JSON.parse(current_val), val);
      localStorage.setItem(key, JSON.stringify(current_val));
    } else {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }

  async predictAll() {
    if (this.selection.selected.length == 0) {
      alert("No data selected");
      return
    }
    this.running_progress = 0;
    this.running = true;
    this.stop = false;
    let total = this.selection.selected.length;
    let i = 0;
    for (let val of this.selection.selected) {
      await this.sendToPrediction(val);
      i += 1;
      this.running_progress = i / total * 100;
      if(this.stop) {
        this.running=false;
        break;
      }
    }
    this.running=false;
  }

  stopClicked() {
    this.stop = true;
    alert("Programme will stop after the current task!");
  }

  exportAsCSV() {
    if (this.selection.selected.length == 0) {
      alert("No data selected");
      return
    }
    let headers = this.docHeaders.concat(['pred_gradability', 'pred_area', 'pred_site']);
    let rows = [headers]
    this.selection.selected.forEach((idx, i, arr) => {
      let row = [];
      headers.forEach((val, j, arr2) => {
        if (val in this.dataSource[idx]) {
          row.push(this.dataSource[idx][val]);
        } else {
          row.push('');
        }
      });
      rows.push(row);
    });
    let csv = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join('\n');
    var encodedUri = encodeURI(csv);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "my_data.csv");
    document.body.appendChild(link);
    link.click(); 
  }
}