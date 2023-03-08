// modules
import axios from 'axios';

// vars
import { app } from '@/main.ts'
import GetToken from '@/functions/login/GetToken.js';

import getTimetable from './GetTimetable';
import getHomeworks from './GetHomeworks';
import getGrades from './GetGrades';
import getNews from './GetNews';

// main function
async function getRecap() {
    // as only pronote is supported for now, we can just return the pronote timetable
    
    // return pronote timetable
    return getPronoteRecap();
}

// pronote : get timetable
function getPronoteRecap() {
    // promise
    return new Promise((resolve, reject) => {
        // vars
        let timetable = []
        let homeworks = []
        let grades = {
            full: [],
            last: []
        }
        let news = []

        let requestsDone = 0;
        
        // timetable
        getTimetable(new Date(), true).then((response) => {
            timetable = response;
            requestsDone++;
        });

        // homeworks
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        getHomeworks(tomorrow, tomorrow, true).then((response) => {
            homeworks = response;
            requestsDone++;
        });

        // grades
        getGrades(true).then((response) => {
            grades.full = response;
            requestsDone++;

            // get all grades in all subjects
            let allGrades = [];
            for (let i = 0; i < grades.full.marks.length; i++) {
                for (let j = 0; j < grades.full.marks[i].marks.length; j++) {
                    allGrades.push(grades.full.marks[i].marks[j]);
                }
            }

            // sort grades by date
            allGrades.sort((a, b) => {
                return new Date(b.info.date) - new Date(a.info.date);
            });

            // get last 5 grades
            for (let i = 0; i < 5; i++) {
                grades.last.push(allGrades[i]);
            }
        });

        // news
        getNews(true).then((response) => {
            news = response;
            requestsDone++;
        });

        // wait for all requests to be done
        let interval = setInterval(() => {
            if (requestsDone == 4) {
                clearInterval(interval);

                // return recap
                resolve({
                    timetable: timetable,
                    homeworks: homeworks,
                    grades: grades,
                    news: news
                });
            }
        });

    });

}

// export
export default getPronoteRecap