import { CourseFactory } from '@courses/sigaa-course-student-factory';
import { Parser } from '@helpers/sigaa-parser';
import { HTTP } from '@session/sigaa-http';
import { URL } from 'url';
import {
  CourseStudent,
  CourseStudentData
} from '@courses/sigaa-course-student';
import { Homework } from '@attachments/sigaa-homework-student';
import { Exam } from '@courseResources/sigaa-exam-student';
import { Activity, ActivityFactory } from '@activity/sigaa-activity-factory';

/**
 * Abstraction to represent a student bond.
 * @category Public
 */
export interface StudentBond {
  readonly type: 'student';
  /**
   * It's the name of the student program, in IFSC it is called "curso".
   */
  readonly program: string;
  /**
   * It is the student registration code, in IFSC it is called "matrícula".
   */
  readonly registration: string;
  /**
   * Get courses, in IFSC it is called "Turmas Virtuais".
   * @param allPeriods if true, all courses will be returned; otherwise, only current courses.
   * @returns Promise with array of courses.
   */
  getCoursesLocal(): Promise<Record<string, string>[]>;

  getCourses(allPeriods?: boolean): Promise<CourseStudent[]>;

  getActivities(): Promise<Activity[]>;

  getCurrentPeriod(): Promise<string>;
}
export interface ActivityTypeHomework {
  type: 'homework';
  course: CourseStudent;
  homework: Homework;
  date: Date;
  done: boolean;
}

export interface ActivityTypeExem {
  type: 'exam';
  title: string;
  course: CourseStudent;
  exem: Exam;
  date: Date;
  done: boolean;
}

/**
 * Class to represent student bond.
 * @category Internal
 */
export class SigaaStudentBond implements StudentBond {
  constructor(
    private http: HTTP,
    private parser: Parser,
    private courseFactory: CourseFactory,
    private activityFactory: ActivityFactory,
    readonly program: string,
    readonly registration: string,
    readonly bondSwitchUrl: URL | null
  ) {}

  readonly type = 'student';
  private _currentPeriod?: string;

  async getCoursesLocal(): Promise<Record<string, string>[]> {
    const frontPage = await this.http.get(
      '/sigaa/portais/discente/discente.jsf'
    );

    const coursesLocal = [];

    const table = frontPage.$('#turmas-portal table:nth-child(3)');
    if (table.length === 0) return [];

    const rows = table.find('tbody > tr').toArray();

    const tableColumnIndexs: Record<string, null | number> = {
      title: null,
      classLocal: null,
      schedule: null
    };

    let tableHeaderCellElements = table.find('thead > tr td').toArray();
    if (!tableHeaderCellElements.length)
      tableHeaderCellElements = table.find('thead > tr th').toArray();

    for (let column = 0; column < tableHeaderCellElements.length; column++) {
      const cellContent = this.parser.removeTagsHtml(
        frontPage.$(tableHeaderCellElements[column]).html()
      );
      switch (cellContent) {
        case 'Componente Curricular':
          tableColumnIndexs.title = column;
          break;
        case 'Local':
          tableColumnIndexs.classLocal = column;
          break;
        case 'Horário':
          tableColumnIndexs.schedule = column;
          break;
      }
    }

    if (tableColumnIndexs.title == null) {
      throw new Error(
        'SIGAA: Invalid courses table, could not find the column with class titles.'
      );
    }
    if (tableColumnIndexs.classLocal == null) {
      throw new Error(
        'SIGAA: Invalid courses table, could not find the column with class local.'
      );
    }
    if (tableColumnIndexs.schedule == null) {
      throw new Error(
        'SIGAA: Invalid courses table, could not find the column with class schedules.'
      );
    }

    for (const row of rows) {
      const cellElements = frontPage.$(row).find('td');
      const title = this.parser.removeTagsHtml(
        cellElements.eq(tableColumnIndexs.title).html()
      );
      const classLocal = this.parser.removeTagsHtml(
        cellElements.eq(tableColumnIndexs.classLocal).html()
      );
      const schedule = this.parser.removeTagsHtml(
        cellElements.eq(tableColumnIndexs.schedule).html()
      );

      const courseData = {
        title,
        classLocal,
        schedule
      };
      coursesLocal.push(courseData);
    }
    return coursesLocal;
  }

  /**
   * Get courses, in IFSC it is called "Turmas Virtuais".
   * @param allPeriods if true, all courses will be returned; otherwise, only latest courses.
   * @returns Promise with array of courses.
   */
  async getCourses(allPeriods = false): Promise<CourseStudent[]> {
    const coursesPage = await this.http.get(
      '/sigaa/portais/discente/turmas.jsf'
    );

    const table = coursesPage.$('.listagem');
    if (table.length === 0) return [];
    const listCourses: CourseStudent[] = [];
    const rows = table.find('tbody > tr').toArray();

    /* 
       If allPeriods is true then only the last period is
       returned, therefore we need to find out what the 
       value of the last period is, since different 
       versions of SIGAA can have different ordering we 
       can't get the last or first period in the table,
       we need to find out which is the newest regardless
       of table order.
    */
    let periodFilter: null | string = null;
    if (!allPeriods) {
      for (let i = 0; i < rows.length; i++) {
        const cellElements = coursesPage.$(rows[i]).find('td');
        if (cellElements.eq(0).hasClass('periodo')) {
          const currentPeriod = this.parser.removeTagsHtml(
            cellElements.eq(0).html()
          );
          if (periodFilter == null) {
            periodFilter = currentPeriod;
          } else if ([currentPeriod, periodFilter].sort()[1] == currentPeriod) {
            //Check alphabetically if the currentPeriod is the oldest
            periodFilter = currentPeriod;
          } else {
            //If the periodFilter is already the newest, we don't need to look for a newest one.
            break;
          }
        }
      }
    }

    const tableColumnIndexs: Record<string, null | number> = {
      title: null,
      class: null,
      schedule: null,
      numberOfStudents: null,
      button: null
    };

    let tableHeaderCellElements = table.find('thead > tr td').toArray();
    if (!tableHeaderCellElements.length)
      tableHeaderCellElements = table.find('thead > tr th').toArray();

    for (let column = 0; column < tableHeaderCellElements.length; column++) {
      const cellContent = this.parser.removeTagsHtml(
        coursesPage.$(tableHeaderCellElements[column]).html()
      );
      switch (cellContent) {
        case 'Disciplina':
          tableColumnIndexs.title = column;
          break;
        case 'Turma':
          tableColumnIndexs.class = column;
          break;
        case 'Horário':
          tableColumnIndexs.schedule = column;
          break;
        case 'Alunos':
          tableColumnIndexs.numberOfStudents = column;
          break;
        case '':
          tableColumnIndexs.button = column;
          break;
      }
    }

    if (tableColumnIndexs.button == null) {
      throw new Error(
        'SIGAA: Invalid courses table, could not find the column with class buttons.'
      );
    }
    if (tableColumnIndexs.title == null) {
      throw new Error(
        'SIGAA: Invalid courses table, could not find the column with class titles.'
      );
    }
    if (tableColumnIndexs.schedule == null) {
      throw new Error(
        'SIGAA: Invalid courses table, could not find the column with class schedules.'
      );
    }

    let coursesLocal = await this.getCoursesLocal();
    let period;

    for (const row of rows) {
      const cellElements = coursesPage.$(row).find('td');
      if (cellElements.eq(0).hasClass('periodo')) {
        period = this.parser.removeTagsHtml(cellElements.html());
      } else if (period && (!periodFilter || periodFilter == period)) {
        const fullname = this.parser.removeTagsHtml(
          cellElements.eq(tableColumnIndexs.title).html()
        );

        const [code, ...titleSlices] = fullname.split(' - ');
        const title = titleSlices.join(' - ');
        let local;
        for (const cl of coursesLocal) {
          if (title === cl.title) local = cl.classLocal;
        }
        const buttonCoursePage = cellElements
          .eq(tableColumnIndexs.button)
          .find('a[onclick]');

        const buttonOnClickCode = buttonCoursePage.attr('onclick');

        if (!buttonOnClickCode)
          throw new Error('SIGAA: Courses table without course button.');

        const form = coursesPage.parseJSFCLJS(buttonOnClickCode);

        let numberOfStudents = 0;
        if (tableColumnIndexs.numberOfStudents !== null) {
          numberOfStudents = Number(
            this.parser.removeTagsHtml(
              cellElements.eq(tableColumnIndexs.numberOfStudents).html()
            )
          );
        }

        const schedule = this.parser.removeTagsHtml(
          cellElements.eq(tableColumnIndexs.schedule).html()
        );

        const id = form.postValues['idTurma'];

        if (!id) throw new Error('SIGAA: Course ID not found.');
        const courseData: CourseStudentData = {
          title,
          code,
          schedule,
          classLocal: local,
          numberOfStudents,
          period,
          id,
          form
        };
        listCourses.push(this.courseFactory.createCourseStudent(courseData));
      }
    }
    return listCourses;
  }

  async getActivities(): Promise<Activity[]> {
    const frontPage = await this.http.get(
      '/sigaa/portais/discente/discente.jsf'
    );
    const table = frontPage.$('#avaliacao-portal > table');
    const rows = table.find('tbody > tr').toArray();
    const listActivities: Activity[] = [];
    for (const row of rows) {
      const cellElements = frontPage.$(row).find('td');
      const dateCellContent = this.parser.removeTagsHtml(
        cellElements.eq(1).html()
      );

      const date = this.parser.parseDates(dateCellContent, 1)[0];

      const done =
        cellElements.eq(0).find('img').attr('src') === '/sigaa/img/check.png' ||
        date.valueOf() < Date.now();

      const infoTextLines = this.parser
        .removeTagsHtml(cellElements.eq(2).find('small').html())
        .split('\n');

      if (infoTextLines.length !== 2)
        throw new Error(
          'SIGAA: The description of the activity does not correspond to what was expected.'
        );

      const courseTitle = infoTextLines[0];
      const [type, activityTitle] = infoTextLines[1].split(': ');

      if (type === 'Questionário' || type === 'Tarefa') {
        const JSFCLJS = cellElements
          .eq(2)
          .find('small a[onclick]')
          .attr('onclick');
        if (!JSFCLJS) throw new Error('SIGAA: Activity without link.');
        const form = frontPage.parseJSFCLJS(JSFCLJS);

        if (type === 'Questionário') {
          listActivities.push(
            this.activityFactory.createActivityQuiz(
              {
                courseTitle,
                quizTitle: activityTitle,
                id: form.postValues.id,
                form,
                done,
                date
              },
              this
            )
          );
        } else {
          listActivities.push(
            this.activityFactory.createActivityHomework(
              {
                courseTitle,
                homeworkTitle: activityTitle,
                form,
                done,
                date
              },
              this
            )
          );
        }
      } else if (type === 'Avaliação') {
        listActivities.push(
          this.activityFactory.createActivityExam(
            {
              courseTitle,
              examDescription: activityTitle,
              done,
              date
            },
            this
          )
        );
      }
    }
    return listActivities;
  }
  async getCurrentPeriod(): Promise<string> {
    if (this._currentPeriod) return this._currentPeriod;
    const frontPage = await this.http.get(
      '/sigaa/portais/discente/discente.jsf'
    );
    const period = frontPage
      .$('#info-usuario > p.periodo-atual > strong')
      .text();
    this._currentPeriod = period;
    return period;
  }
}
