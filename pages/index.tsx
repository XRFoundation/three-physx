
import React from 'react';
import * as physx from '../src'

const page = () => {
  return (<canvas/>);
};

export default page;

if(typeof Worker !== 'undefined') { 
  physx.initializePhysX(new Worker(new URL("../src/worker.ts", import.meta.url)), '/physx.release.js')
}
