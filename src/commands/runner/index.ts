/* eslint-disable perfectionist/sort-classes */
import { Command, Flags } from '@oclif/core'
import * as newman from "newman";
import * as path from "node:path";
import { EventEmitter } from 'node:stream';

export default class Runner extends Command {
    static description = 'Run all the collections'

    static flags = {
        collectionPath: Flags.string({ description: 'Path of the root dir where the collections are present', required: true }),
        dataPath: Flags.string({ description: 'Path of the root dir where the iteration data are present', required: true }),
        env: Flags.string({ default: "localhost", description: 'Path of the environment file for newman', options: ["localhost", "staging", "prod"], required: false }),
        envPath: Flags.string({ description: 'Path of the environment file for newman', required: false }),
        schoolName: Flags.string({ default: "test runner newman", description: 'Path of the environment file for newman', required: false }),
        tests: Flags.string({ description: 'Name of collections that you want to run', multiple: true, options: ["setup-all", "delete"], required: false }),
    }

    async run(): Promise<number> {
        const { flags } = await this.parse(Runner)

        const { tests } = flags;
        this.#initProps(flags);

        if (!tests) {
            const payloads = this.#allSteps;
            const runner = new RunTests(payloads);
            runner.start();
            return 0;
        }

        this.#runTestOptions(tests);
        return 0;
    }

    // basics
    #environmentPath!: string;
    #schoolName!: string;

    // collections
    #setupSchool!: string;
    #setupAyGrades!: string;
    #createTimetable!: string;
    #addTeachers!: string;
    #addStudents!: string;
    #deleteSchool!: string;

    // data files
    #schoolDataPath!: string;
    #teachersDataPath!: string;
    #studentsDataPath!: string;
    #timetablesDataPath!: string;

    get #setupSchoolContent() {
        return new PayloadContent(this.#setupSchool, this.#schoolDataPath, this.#environmentPath, this.#schoolName)
    }

    get #setupAyGradesContent() {
        return new PayloadContent(this.#setupAyGrades, this.#schoolDataPath, this.#environmentPath, this.#schoolName);
    }

    get #createTimetableContent() {
        return new PayloadContent(this.#createTimetable, this.#timetablesDataPath, this.#environmentPath, this.#schoolName);
    }

    get #addTeachersContent() {
        return new PayloadContent(this.#addTeachers, this.#teachersDataPath, this.#environmentPath, this.#schoolName);
    }

    get #addStudentsContent() {
        return new PayloadContent(this.#addStudents, this.#studentsDataPath, this.#environmentPath, this.#schoolName);
    }

    get #deleteSchoolContent() {
        return new PayloadContent(this.#deleteSchool, this.#schoolDataPath, this.#environmentPath, this.#schoolName);
    }

    get #allSetupSteps() {
        return [
            this.#setupSchoolContent,
            this.#setupAyGradesContent,
            this.#createTimetableContent,
            this.#addTeachersContent,
            this.#addStudentsContent,
        ];
    }

    get #deleteSteps() {
        return [
            this.#deleteSchoolContent
        ]
    }

    get #allSteps() {
        return [
            ...this.#allSetupSteps,
            ...this.#deleteSteps,
        ];
    }


    #initProps(flags: { collectionPath: string; dataPath: string; env: string; envPath: string | undefined; schoolName: string; }) {
        const { collectionPath, dataPath, env: envFileName, envPath, schoolName } = flags;
        const envDir = envPath === undefined ? collectionPath : envPath;
        const envFile = envFileName.endsWith(".postman_environment.json") ? envFileName : `${envFileName}.postman_environment.json`

        // envrionment
        this.#environmentPath = path.join(envDir, envFile);
        this.#schoolName = schoolName;

        // iteration data
        this.#schoolDataPath = path.join(dataPath, "school.json");
        this.#teachersDataPath = path.join(dataPath, "teachers.json");
        this.#studentsDataPath = path.join(dataPath, "students.json");
        this.#timetablesDataPath = path.join(dataPath, "timetables.json");

        // collections
        this.#deleteSchool = path.join(collectionPath, "delete-school")
        this.#setupSchool = path.join(collectionPath, "setup-school")
        this.#setupAyGrades = path.join(collectionPath, "setup-ay-grades")
        this.#addTeachers = path.join(collectionPath, "add-teachers")
        this.#addStudents = path.join(collectionPath, "add-students")
        this.#createTimetable = path.join(collectionPath, "create-timetable")
    }

    #runTestOptions(tests: string[], index: number = 0): number {
        if (index >= tests.length) {
            return 0;
        }

        const test = tests[index];
        switch (test) {
            case "setup-all": {
                const payloads = this.#allSetupSteps;
                const runner = new RunTests(payloads);
                runner.start();
                break;
            }

            case "delete": {
                const payloads = this.#deleteSteps;
                const runner = new RunTests(payloads);
                runner.start();
                break;
            }

            default: {
                throw new Error(`Not Implemented Error: ${test}`);
            }
        }

        return this.#runTestOptions(tests, index+1);
    }

}

class PayloadContent {
    collectionPath: string;
    dataPath: string;
    environmentPath: string;
    schoolName: string;

    constructor(collectionPath: string, dataPath: string, environmentPath: string, schoolName: string) {
        this.collectionPath = collectionPath;
        this.dataPath = dataPath;
        this.environmentPath = environmentPath;
        this.schoolName = schoolName;
    }
}


class RunTests {

    _payloads: Array<PayloadContent> = [];

    constructor(payloads: Array<PayloadContent>) {
        this._payloads = payloads;
    }


    start() {
        if (this._payloads.length === 0) {
            console.warn("No payloads to run.");
            return -1;
        }

        return this.#start(0);
    }

    #runTests(environmentPath: string, dataPath: string, collectionPath: string, schoolName: string): EventEmitter {
        const colPath = collectionPath.endsWith(".postman_collection.json") ? collectionPath : `${collectionPath}.postman_collection.json`
        const envPath = environmentPath.endsWith(".postman_environment.json") ? environmentPath : `${environmentPath}.postman_environment.json`

        return newman.run({
            collection: colPath,  // require('./sample-collection.json'),
            envVar: [{ key: "school_name", value: schoolName }],
            environment: envPath,
            iterationData: dataPath,
            reporters: 'cli',
        }, (err) => {
            if (err) { throw err; }
            console.log('collection run complete!');
        });
    }

    #start(index: number) {
        if (index >= this._payloads.length) {
            console.log("Finished Running.");
            return 0;
        }

        const payload = this._payloads[index];
        const {collectionPath, dataPath, environmentPath, schoolName} = payload;
        this.#runTests(environmentPath, dataPath, collectionPath, schoolName).on("done", (error, summary) => {
            if (error) {
                console.error(error);
                return 1;
            }

            if (summary.error) {
                console.error(summary.error);
                return 1;
            }

            return this.#start(index+1);
        });
    }
}