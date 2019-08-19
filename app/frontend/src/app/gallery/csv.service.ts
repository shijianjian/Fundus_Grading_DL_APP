import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class CSVService {
    private subject = new BehaviorSubject<CSVData>({csv:[], header: []});
    private taskList = new BehaviorSubject<any>([]);

    sendCSV(csvdata: CSVData): void {
        this.subject.next(csvdata);
    }

    clearCSV(): void {
        this.subject.next({csv:[], header: []});
    }

    getSubject(): BehaviorSubject<CSVData>{
        return this.subject;
    }

    getCSV(): CSVData {
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

export interface CSVData {
    csv: {}[];
    header: string[];
}