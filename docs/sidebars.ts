import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import api from './docs/api/typedoc-sidebar.cjs';

const sidebars: SidebarsConfig = {
  apiSidebar: [                                                                                                                       
    {                                                                                                                                
      type: 'category',                                                                                                              
      label: 'API Documentation',                                                                                                    
      items: [api],
                                                                 
    }                                                                                                                                
  ]
};

export default sidebars;

