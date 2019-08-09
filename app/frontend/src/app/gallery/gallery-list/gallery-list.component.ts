import { Component, OnInit, OnDestroy } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import {animate, state, style, transition, trigger} from '@angular/animations';
import { CSVService } from '../csv.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';

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

  constructor(private csvService: CSVService, private http: HttpClient) {
    this.csvSubscription = this.csvService.getCSV().subscribe(data => {
      if (data) {
        this.dataSource = data['csv'];
        this.docHeaders = data['header'];
        this.columnsToDisplay = ['select'].concat(data['header']).concat(['load', 'run']);
        ['pred_gradability', 'pred_area', 'pred_site'].forEach((val, idx, arr) => {
          if (this.columnsToDisplay.includes(val)) {
            this.columnsToDisplay.splice(idx, 1);
          }
          this.columnsToDisplay.push(val);
        })
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
    const params = new HttpParams().set('path', encodeURIComponent(this.dataSource[idx]['filepath']))
    return this.http.get('http://127.0.0.1:5000/gradability/predict/local', {params}).pipe(switchMap((x: any) => {
      if (x['results'] == 'Gradable') {
        return forkJoin([
          of(idx),
          of(x),
          this.http.get('http://127.0.0.1:5000/area_tagging/predict/local', {params}),
          this.http.get('http://127.0.0.1:5000/site_tagging/predict/local', {params})
        ]);
      } else {
        return forkJoin([
          of(idx),
          of(x),
        ]);
      }
    }));
  }

  imageLaunchListener(idx: number) {
    this.dataSource[idx]['base64_src_loading'] = true;
    const params = new HttpParams().set('path', encodeURIComponent(this.dataSource[idx]['filepath']));
    return this.http.get('http://127.0.0.1:5000/image/local', {params}).pipe(take(1)).subscribe(image => {
      this.dataSource[idx]['base64_src'] = 'data:image/png;base64,' + image['image'];
      this.dataSource[idx]['base64_src_loading'] = false;
    });
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
      },
      error => {
        console.log(error);
      }
    );
  }

  async predictAll() {
    if (this.selection.selected.length == 0) {
      alert("No data selected");
      return
    }
    // console.log(this.selection);
    let arrs: Observable<Observable<any>[]>[] = []
    for (let val of this.selection.selected) {
      await this.sendToPrediction(val);
    }
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