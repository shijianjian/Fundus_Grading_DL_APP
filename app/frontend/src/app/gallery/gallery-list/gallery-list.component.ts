import { Component, OnInit, OnDestroy } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import {animate, state, style, transition, trigger} from '@angular/animations';
import { CSVService } from '../csv.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
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
  dataSource = []
  subscription: Subscription;
  columnsToDisplay = []
  selection = new SelectionModel<any>(true, []);

  constructor(private csvService: CSVService, private http: HttpClient) {
    this.subscription = this.csvService.getCSV().subscribe(data => {
      if (data) {
        this.dataSource = data['csv'];
        this.columnsToDisplay = ['select'].concat(data['header']).concat(['explore', 'run', 'pred_gradability', 'pred_area', 'pred_site'])
        console.log(data);
      }
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.subscription.unsubscribe();
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
        this.dataSource.forEach(row => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  sendToPrediction(idx, event) {
    const params = new HttpParams().set('path', encodeURI(event['filepath']))
    // let res = {}
    this.http.get('http://127.0.0.1:5000/gradability/predict/local', {params}).pipe(take(1)).subscribe(
      data => {
        this.dataSource[idx]['pred_gradability'] = data['results'];
        if (data['results'] == 'Gradable') {
          this.http.get('http://127.0.0.1:5000/area_tagging/predict/local', {params}).pipe(take(1)).subscribe(
            data => {
              // res['area'] = data['results'];
              this.dataSource[idx]['pred_area'] = data['results'];
              console.log(this.dataSource[idx])
            }
          );
          this.http.get('http://127.0.0.1:5000/site_tagging/predict/local', {params}).pipe(take(1)).subscribe(
            data => {
              // res['site'] = data['results'];
              this.dataSource[idx]['pred_site'] = data['results'];
              console.log(this.dataSource[idx])
            }
          );
        }
      },
      error => {
        console.log(error)
      }
    );
  }

}