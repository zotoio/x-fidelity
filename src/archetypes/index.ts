import { ArchetypeConfig, Exemption } from '../types/typeDefs';
import fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

function loadArchetypeFromJson(fileName: string): ArchetypeConfig {
    const filePath = path.join(__dirname, fileName);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(fileContent) as ArchetypeConfig;
    } catch (error) {
        logger.error(`Error parsing JSON in file ${fileName}: ${error}`);
        return {} as ArchetypeConfig; 
    }
}

function loadExemptionsFromJson(fileName: string): Exemption[] {
    const filePath = path.join(__dirname, fileName);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(fileContent) as Exemption[];
    } catch (error) {
        logger.error(`Error parsing JSON in file ${fileName}: ${error}`);
        return [] as Exemption[]; 
    }
}


export const archetypes: Record<string, ArchetypeConfig> = {
    'node-fullstack': loadArchetypeFromJson('node-fullstack.json'),
    'java-microservice': loadArchetypeFromJson('java-microservice.json')
};

export const exemptions: Record<string, Exemption[]> = {
    'node-fullstack': loadExemptionsFromJson('node-fullstack-exemptions.json'),
    'java-microservice': loadExemptionsFromJson('java-microservice-exemptions.json')
};
