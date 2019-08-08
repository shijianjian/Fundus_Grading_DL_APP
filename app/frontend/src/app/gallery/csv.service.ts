import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class CSVService {
    private subject = new Subject<any>();

    sendCSV(csv: any, header: any[]) {
        this.subject.next({ csv: csv, header: header });
    }

    clearCSV() {
        this.subject.next();
    }

    getCSV(): Observable<any> {
        return this.subject.asObservable();
    }
}