import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';

@Injectable()
export class CSVService {
    private subject = new BehaviorSubject<any>([]);
    private taskList = new BehaviorSubject<any>([]);

    sendCSV(csv: any, header: any[]) {
        this.subject.next({ csv: csv, header: header });
    }

    clearCSV() {
        this.subject.next([]);
    }

    getSubject(){
        return this.subject;
    }

    getCSV(): any {
        return this.subject.getValue();
    }

    sendTask(taskList: any[]) {
        this.taskList.next({ taskList: taskList });
    }

    clearTask() {
        this.taskList.next([]);
    }

    getTask(): any {
        return this.taskList.getValue();
    }
}