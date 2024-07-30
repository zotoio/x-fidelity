import { ArchetypeConfig } from '../types/typeDefs';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

function loadArchetypeFromJson(fileName: string): ArchetypeConfig {
    const filePath = path.join(__dirname, fileName);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(fileContent) as ArchetypeConfig;
    } catch (error) {
        logger.error(`Error parsing JSON in file ${fileName}: ${error}`);
        return {} as ArchetypeConfig; // Return an empty object as a fallback
    }
}

export const archetypes: Record<string, ArchetypeConfig> = {
    'node-fullstack': loadArchetypeFromJson('node-fullstack.json'),
    'java-microservice': loadArchetypeFromJson('java-microservice.json')
};
