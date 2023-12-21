import { Command, Flags } from '@oclif/core'
import * as newman from "newman";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export default class Runner extends Command {
    static description = 'Run all the collections'

    static flags = {
        collectionPath: Flags.string({ description: 'Path of the root dir where the collections are present', required: true }),
        dataPath: Flags.string({ description: 'Path of the root dir where the iteration data are present', required: true }),
        env: Flags.string({ default: "local-host", description: 'Path of the environment file for newman', required: false }),
        envPath: Flags.string({ description: 'Path of the environment file for newman', required: false }),
        schoolName: Flags.string({ default: "test runner newman", description: 'Path of the environment file for newman', required: false }),
        tests: Flags.string({ description: 'Name of collections that you want to run', multiple: true, required: false }),
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Runner)

        const { collectionPath, dataPath, env: envFileName, schoolName } = flags;
        const envDir = flags.envPath === undefined ? collectionPath : flags.envPath;
        const envFile = envFileName.endsWith(".postman_environment.json") ? envFileName : `${envFileName}.postman_environment.json`
        // envrionment
        const envPath = path.join(envDir, envFile);
        // iteration data
        const schoolDataPath = path.join(dataPath, "school.json");
        const teachersDataPath = path.join(dataPath, "teachers.json");
        const timetablesDataPath = path.join(dataPath, "timetables.json");
        // collections
        const deleteSchool = path.join(collectionPath, "delete-school")
        const setupSchool = path.join(collectionPath, "setup-school")
        const setupAyGrades = path.join(collectionPath, "setup-ay-grades")
        const addTeachers = path.join(collectionPath, "add-teachers")
        const createTimetable = path.join(collectionPath, "create-timetable")

        this.runTests(envPath, schoolDataPath, setupSchool, schoolName);
        this.runTests(envPath, schoolDataPath, setupAyGrades, schoolName);
        this.runTests(envPath, timetablesDataPath, createTimetable, schoolName);
        this.runTests(envPath, teachersDataPath, addTeachers, schoolName);
        this.runTests(envPath, schoolDataPath, deleteSchool, schoolName);

        this.log(`Finished running.`);
        this.log(`collectionPath: ${collectionPath}`);
        this.log(`dataPath: ${dataPath}`);
        this.log(`envPath: ${envPath}`);
    }

    runTests(environmentPath: string, dataPath: string, collectionPath: string, schoolName: string): void {
        const colPath = collectionPath.endsWith(".postman_collection.json") ? collectionPath : `${collectionPath}.postman_collection.json`
        const envPath = environmentPath.endsWith(".postman_environment.json") ? environmentPath : `${environmentPath}.postman_environment.json`
        this.log(`[runTests] envPath: ${envPath}`);
        this.log(`[runTests] dataPath: ${dataPath}`);
        this.log(`[runTests] colPath: ${colPath}`);
        // const collectionContent = await fs.readFile(colPath, 'utf8');
        // const envContent = await fs.readFile(envPath, 'utf8');
        // const dataContent = await fs.readFile(dataPath, 'utf8');

        newman.run({
            // collection: collectionContent,  // require('./sample-collection.json'),
            // environment: envContent,
            // iterationData: dataContent,
            collection: colPath,  // require('./sample-collection.json'),
            envVar: [{ key: "name", value: schoolName }],
            environment: envPath,
            iterationData: dataPath,
            reporters: 'cli',
        }, (err) => {
            if (err) { throw err; }
            console.log('collection run complete!');
        });
    }
}
