import { IManagerConfig } from '@rws-framework/manager';
import { rwsPath } from '@rws-framework/console';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(rwsPath.findRootWorkspacePath(), '.env');
const envData = dotenv.config({ path: envPath }); 

if (envData.error) {
    throw envData.error;
}

const env = envData.parsed as {
    FRONT_BUILD_DIR: string   
    DEV?: string
};

export default function config(): IManagerConfig
{
    return {
        dev: env?.DEV !== undefined && env.DEV === '1',
        build: {      
            front: {
                workspaceDir: 'code/',
                outputDir: `../public/js`,
                outputFileName: 'poke.rws.js',
                publicDir: '../public',  
                hotReload: true,           
                cssDir: `../public/css/generated`,  
                _builders: {
                    ts: {
                        includes: [         
                        ],
                        paths: {
                            '@front': ['./src']                            
                        }    
                    }
                }                                                      
            }
        }
    }
}