import {buildPlan, type Config, type Product} from './planner';
self.onmessage=(event:MessageEvent<{config:Config;products:Product[];variant:number}>)=>{
  try {const {config,products,variant}=event.data;self.postMessage({days:buildPlan(config,products,variant)});}
  catch(error){self.postMessage({error:error instanceof Error?error.message:'Unable to build a plan.'});}
};
