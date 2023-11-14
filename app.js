import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "./libs/utils.js";
import { ortho, lookAt, flatten, vec3, translate, rotateX, rotateY,mult,vec4 } from "./libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, multTranslation, pushMatrix, popMatrix, multRotationX, multRotationZ, multMatrix } from "./libs/stack.js";


import * as CUBE from './libs/objects/cube.js';
import * as CYLINDER from './libs/objects/cylinder.js';
import * as PYRAMID from './libs/objects/pyramid.js';
import * as SPHERE from './libs/objects/sphere.js'

/** @type WebGLRenderingContext */
let gl;

let time = 0;           
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)


let gama=-20;
let teta=15;


let isTrianglesMode = true;

const tileHeight=0.2;
const tileSize = 5;
const numberTilesColumn=5;
const numberTilesLine= 5;
const beginZPosition = numberTilesColumn/2-0.5;
const beginXPosition = numberTilesLine/2-0.5;
const T1=6;
const L1=2;
const E1=0.1;
const T2=8;
const L2=L1-E1;
const E2=E1;
const T3=6;
const L3=2;
const E3=E1;
const cylinderRadius=L3;
const cylinderHeight=0.5;
const numElemsViga =Math.floor( T3 +T3/3);
const numTriangleBlocksForCube= Math.floor(numElemsViga/4);
const beginInsideBasePosition=T2/2-0.5;
const beginBasePosition=T1/2-0.5;
const maxCarPosition=L3;
const gravityAcceleration = -9.8;
const numCargas =8;
const maxRadiusCarga=L3*(numElemsViga/2-0.5)+L3*(numElemsViga/2-numTriangleBlocksForCube)-0.5*L3-cylinderRadius;
const minRadiusCarga=L3*(numElemsViga/2-numTriangleBlocksForCube)+maxCarPosition+0.5*L3-cylinderRadius;


let VP_DISTANCE = T2*L2/2*3/2;
let level = 0;
let zoom = 1;
let vigaRotation = 0;
let carMove = L3*(numElemsViga/2-0.5);
let hookLength=0.3;
let far ;
let eyeAP=[0,T2*L2/2,VP_DISTANCE*2];
let atAP=[0,T2*L2/2,0];
let negativeATAP=[-atAP[0],-atAP[1],-atAP[2]];
let upAP= [0,1,0];
let newEye=mult(translate(atAP),mult(rotateX(gama),mult(rotateY(teta),mult(translate(negativeATAP),vec4(eyeAP,1)))));
let newup=mult(rotateX(gama),mult(rotateY(teta),vec4(upAP,1)));
let currentEye=[newEye[0],newEye[1],newEye[2]];
let currentAt=atAP;
let currentUp=[newup[0],newup[1],newup[2]];
let mview = lookAt([newEye[0],newEye[1],newEye[2]], atAP, [newup[0],newup[1],newup[2]]);
let isAxonometrica= true;
let cargas=[];
let lastFrame=0;
let cargaTypes=["cube","cylinder","pyramid"];
let closeGarra=0;
let droping = false;
let catching = false;
let indiceObject=-1;
let positionBefore = [0,0,0], positionAfter = [0,0,0];
let isClosed = false;
let radius;



class Carga{
    
    constructor(x,y,z, typeCarga, r,g,b){
        this.orientation=0;
        this.position= [x,y,z];
        this.velocity= [0,0,0];
        this.type =typeCarga;
        this.acceleration=[0,gravityAcceleration,0];
        this.color=vec3(r,g,b);
        
    }
    changePosition(timePassed){
        for(let i =0; i<3;i++){
            this.position[i]=this.position[i]+this.velocity[i]*timePassed+1/2*this.acceleration[i]*timePassed*timePassed;
        }
        if(this.position[1]< 0){
            this.position[1]=0;
            this.velocity[1]=0;
        }
        
    }

    changeVelocity(timePassed){
        for(let i =0; i<3;i++){
            this.velocity[i]=this.velocity[i]+this.acceleration[i]*timePassed;
        }
        if(this.position[1]== 0){
            this.velocity[1]=0;
        }
    }

    moveObject(x,y,z){
            this.position[0]+=x;
            this.position[1]+=y;
            this.position[2]+=z;
    }
    rotate(angle){
        this.orientation+=angle;
    }
    

}

function fisicLaws(){
    for(let i = 0; i<cargas.length;i++){
        cargas[i].changePosition(lastFrame);
        cargas[i].changeVelocity(lastFrame);
    }

}

function spawnCarga(){
   

    for(let i = 0; i<numCargas;i++){
        let j=Math.floor(2000*Math.random()%3);
        let randX=0;
        let randZ=0;
        let randR=Math.random();
        let randG=Math.random();
        let randB=Math.random();

        while(((randX*randX+randZ*randZ<minRadiusCarga*minRadiusCarga) || (randX*randX+randZ*randZ>maxRadiusCarga*maxRadiusCarga) || !isAvailablePosition(randX,randZ))){

            randX=(Math.random()-0.5)*2*maxRadiusCarga;
            randZ=(Math.random()-0.5)*2*maxRadiusCarga;
        }
        cargas.push(new Carga(randX,0,randZ,cargaTypes[j],randR,randG,randB));
    }
}

function isAvailablePosition(x,z){
    for(let i = 0; i<cargas.length;i++){
        let cargaX=cargas[i].position[0];
        let cargaZ=cargas[i].position[2];

        if(2*L3*L3>Math.pow(x-cargaX,2)+Math.pow(z-cargaZ,2)){
            return false;
        }
    }
    return true;
}

function catchCarga(x,y,z){
    for(let i = 0; i<cargas.length;i++){
        
        let cargaX=cargas[i].position[0];
        let cargaY=cargas[i].position[1];
        let cargaZ=cargas[i].position[2];
        if(2*L3*L3>Math.pow(x-cargaX,2)+Math.pow(z-cargaZ,2)+ Math.pow(y-cargaY,2) && indiceObject==-1 ){
            indiceObject=i;
            cargas[i].acceleration[1]=0;
            cargas[i].velocity[1]=0;
            return true;
        }
    }
    return false;
    
}


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    let objectProgram = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shaderObjects.frag"]);

    far=Math.max(
    Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-newEye[1],2)
    +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[2],2)),

    Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-newEye[1],2)
    +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[2],2)
    ));

    let mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);

    mode = gl.TRIANGLES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    function calculateEyeWithZoom(eye){
        return [eye[0]*zoom,eye[1]*zoom,eye[2]*zoom];
    }

    function calculateAtWithZoom(at){
        return [at[0]*zoom,at[1]*zoom,at[2]*zoom];
    }

    document.onkeydown = function(event) {
        switch(event.key) {
            case '0':
                if(isTrianglesMode){
                    mode= gl.LINES;
                    
                }else{
                    mode = gl.TRIANGLES;
                    
                }
                isTrianglesMode=!isTrianglesMode;
                break;  
            case '1':
                currentEye=eyeAP;
                currentAt=atAP;
                currentUp=upAP;
                mview = lookAt(calculateEyeWithZoom(currentEye),calculateAtWithZoom(atAP),upAP);isAxonometrica= false;
                far=Math.max(
                    Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(eyeAP)[0],2)+Math.pow(0-calculateEyeWithZoom(eyeAP)[1],2)
                    +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(eyeAP)[2],2)),
                
                    Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(eyeAP)[0],2)+Math.pow(0-calculateEyeWithZoom(eyeAP)[1],2)
                    +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(eyeAP)[2],2)
                    ));
                mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
            case '2':
                currentEye=[0,T2*L2+2*L3,0];
                currentAt=[0,0,0];
                currentUp=[0,0,-1];
                mview = lookAt(calculateEyeWithZoom(currentEye),calculateAtWithZoom(currentAt),currentUp);isAxonometrica= false;
                far=Math.max(
                    Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom,2)+Math.pow(calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom,2)),
                
                    Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom,2)+Math.pow(calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom,2)
                    ));
                mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
            case '3':
                currentEye=[-1, T2*L2/2, 0];
                currentAt=atAP;
                currentUp=[0, 1, 0];
                mview= lookAt(calculateEyeWithZoom(currentEye), calculateAtWithZoom(currentAt), currentUp);isAxonometrica= false;
                far=Math.max(
                    Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom+1,2)+Math.pow( calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom,2)),
                
                    Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom+1,2)+Math.pow( calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom,2)
                    ));
                mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
            case '4':
                isAxonometrica= true;
                newEye=mult(translate(atAP),mult(rotateX(gama),mult(rotateY(teta),mult(translate(negativeATAP),vec4(eyeAP,1)))));
                newup=mult(rotateX(gama),mult(rotateY(teta),vec4(upAP,1)));
                currentEye=[newEye[0],newEye[1],newEye[2]];
                currentAt=atAP;
                currentUp=[newup[0],newup[1],newup[2]];


                mview = lookAt(calculateEyeWithZoom(currentEye), calculateAtWithZoom(currentAt), currentUp);

                far=Math.max(
                    Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
                
                    Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
                    ));
                
                    mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
            case 'r':
                zoom = 1;
                far=Math.max(
                    Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-currentEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
                
                    Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-currentEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                    +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
                    ));
                mview = lookAt(currentEye, currentAt, currentUp);
                mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
            case 'w':
                positionBefore[1]=hookLength;
                hookLength=Math.max(hookLength-0.1,0.3);
                positionAfter[1]=hookLength;
                if(indiceObject!=-1 ){
                    cargas[indiceObject].moveObject(0,-(positionAfter[1]-positionBefore[1]),0);
                   
                    
                }
                break;
            case 's':
                positionBefore[1]=hookLength;
                hookLength=Math.min(hookLength+0.1,T2*(L2-E1)+level+cylinderHeight*2 -L3*1.5-L3);//-L3*1.5-L3*L3
                positionAfter[1]=hookLength;
                
                if(indiceObject!=-1){
                    
                    cargas[indiceObject].moveObject(0,-(positionAfter[1]-positionBefore[1]),0);
                   
                }
                break;
            case 'i':
                positionBefore[1]=level;
                level=Math.min(0.1+level,T1*(L1-E1/2)-2*L2);
                positionAfter[1]=level;
                if(indiceObject!=-1){
                    
                    cargas[indiceObject].moveObject(0,(positionAfter[1]-positionBefore[1]),0);
                   
                }
                break;
            case 'k':
                positionBefore[1]=level;
                level=Math.max(level-0.1,0);
                hookLength=Math.min(hookLength,T2*(L2-E1)+level+cylinderHeight*2);
                positionAfter[1]=level;
                if(indiceObject!=-1){

                    cargas[indiceObject].moveObject(0,(positionAfter[1]-positionBefore[1]),0);
                   
                }
                break;
            case 'j':
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionBefore[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionBefore[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                vigaRotation+=0.5;
    
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionAfter[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionAfter[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                if(indiceObject!=-1){
                    cargas[indiceObject].moveObject(positionAfter[0]-positionBefore[0],0,positionAfter[2]-positionBefore[2]);
                    cargas[indiceObject].rotate(0.5);
                   
                }            
                break;
            case 'l':
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionBefore[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionBefore[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                vigaRotation-=0.5;
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionAfter[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionAfter[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                if(indiceObject!=-1){
                    cargas[indiceObject].moveObject(positionAfter[0]-positionBefore[0],0,positionAfter[2]-positionBefore[2]);
                    cargas[indiceObject].rotate(-0.5);
                }            
                break;
            case 'a':
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionBefore[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionBefore[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                carMove=Math.min(0.1+carMove,L3*(numElemsViga/2-0.5));
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionAfter[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionAfter[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                if(indiceObject!=-1){
                    cargas[indiceObject].moveObject(positionAfter[0]-positionBefore[0],0,positionAfter[2]-positionBefore[2]);
                   
                }
                break;
            case 'd':
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionBefore[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionBefore[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                carMove=Math.max(carMove-0.1,maxCarPosition);
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                positionAfter[0]=radius*Math.sin(Math.PI/180*(vigaRotation));
                positionAfter[2]=radius*Math.cos(Math.PI/180*(vigaRotation));
                if(indiceObject!=-1){
                    cargas[indiceObject].moveObject(positionAfter[0]-positionBefore[0],0,positionAfter[2]-positionBefore[2]);
                   
                }
                break;
            case 'ArrowLeft'://left
                if(!isAxonometrica)
                break;
                    teta=teta+0.25
                    newEye=mult(translate(atAP),mult(rotateX(gama),mult(rotateY(teta),mult(translate(negativeATAP),vec4(eyeAP,1)))));
                    newup=mult(rotateX(gama),mult(rotateY(teta),vec4(upAP,1)));
                    currentEye=newEye;
                    currentAt=atAP;
                    currentUp=[newup[0],newup[1],newup[2]];
    
    
                    mview = lookAt(calculateEyeWithZoom(currentEye), calculateAtWithZoom(currentAt), currentUp);
    
                    far=Math.max(
                        Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
                    
                        Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
                        ));
                    
                        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
            case 'ArrowRight'://right
                if(!isAxonometrica)
                break;
                    teta=teta-0.25
                    newEye=mult(translate(atAP),mult(rotateX(gama),mult(rotateY(teta),mult(translate(negativeATAP),vec4(eyeAP,1)))));
                    newup=mult(rotateX(gama),mult(rotateY(teta),vec4(upAP,1)));
                    currentEye=newEye;
                    currentAt=atAP;
                    currentUp=[newup[0],newup[1],newup[2]];
    
    
                    mview = lookAt(calculateEyeWithZoom(currentEye), calculateAtWithZoom(currentAt), currentUp);
    
                    far=Math.max(
                        Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
                    
                        Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
                        ));
                    
                        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                break;
    
            case 'ArrowDown':
                    if(!isAxonometrica)
                    break;
                    gama=gama-0.25
                    newEye=mult(translate(atAP),mult(rotateX(gama),mult(rotateY(teta),mult(translate(negativeATAP),vec4(eyeAP,1)))));
                    newup=mult(rotateX(gama),mult(rotateY(teta),vec4(upAP,1)));
                    currentEye=newEye;
                    currentAt=atAP;
                    currentUp=[newup[0],newup[1],newup[2]];
    
    
                    mview = lookAt(calculateEyeWithZoom(currentEye), calculateAtWithZoom(currentAt), currentUp);
    
                    far=Math.max(
                        Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
                    
                        Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
                        ));
                    
                        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                    break;
            case 'ArrowUp':
                    if(!isAxonometrica)
                    break;
                    gama=gama+0.25
                    newEye=mult(translate(atAP),mult(rotateX(gama),mult(rotateY(teta),mult(translate(negativeATAP),vec4(eyeAP,1)))));
                    newup=mult(rotateX(gama),mult(rotateY(teta),vec4(upAP,1)));
                    currentEye=newEye;
                    currentAt=atAP;
                    currentUp=[newup[0],newup[1],newup[2]];
    
    
                    mview = lookAt(calculateEyeWithZoom(currentEye), calculateAtWithZoom(currentAt), currentUp);
    
                    far=Math.max(
                        Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
                    
                        Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-newEye[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
                        +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
                        ));
                    
                        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
                    break;
            case ' '://drop
            
                if(closeGarra>20){
                    droping= true;
                    catching= false;}
                if(indiceObject!=-1)
                    cargas[indiceObject].acceleration=[0,gravityAcceleration,0];
                    indiceObject=-1;
                isClosed=false;
                    
                break;
            case 'c'://catch
                radius= carMove+L3*(numElemsViga/2-numTriangleBlocksForCube)-cylinderRadius;
                if(hookLength==T2*(L2-E1)+level+cylinderHeight*2 -L3*1.5-L3 && isClosed==false){
                    catchCarga(radius*Math.sin(Math.PI/180*(vigaRotation)),0,radius*Math.cos(Math.PI/180*(vigaRotation)));
                }
                catching= true;
                droping= false;
                isClosed=true;
                
                break;


        }
        
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
    CUBE.init(gl);
    CYLINDER.init(gl);
    PYRAMID.init(gl);
    SPHERE.init(gl);

    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);
    

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);


        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(objectProgram, "mModelView"), false, flatten(modelView()));
        
    
    }

    window.addEventListener('wheel', (event) => {
       
        if(event.deltaY>0){
            zoom = Math.max(0.9*zoom,Math.pow(0.9,23));//zoom out

           
        }else{
            zoom /= 0.9;//zoom in
                          
        }
        far=Math.max(
            Math.sqrt(Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
            +Math.pow(-Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)),
        
            Math.sqrt(Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[0],2)+Math.pow(0-calculateEyeWithZoom(currentEye)[1],2)
            +Math.pow(Math.max(numberTilesColumn,numberTilesLine)*tileSize*zoom-calculateEyeWithZoom(currentEye)[2],2)
            ));

        mProjection = ortho(-VP_DISTANCE*aspect,VP_DISTANCE*aspect, -VP_DISTANCE, VP_DISTANCE,-far,far);
        mview= lookAt(calculateEyeWithZoom(currentEye),calculateAtWithZoom(currentAt),currentUp);
        
       
    });
    

    function tiles(total)
    {
        multScale([tileSize, tileHeight, tileSize]);

        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
        if(total%2==0){

           gl.uniform3fv(uColor, vec3(0.35,0.35,0.35));
            
        }else{
            gl.uniform3fv(uColor, vec3(0.9,0.9,0.9));
       
        }
        CUBE.draw(gl, objectProgram, mode); 
    }

    function floor(){
        for(let j=0; j<numberTilesColumn;j++)
            for(let i=0; i<numberTilesLine;i++){
                
                pushMatrix();
                    multTranslation([-beginXPosition*tileSize+i*tileSize,0,-beginZPosition*tileSize+j*tileSize]);
                    tiles((i+j));
                popMatrix();
                
                
            }

       
    }

    function aresta(){

        
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
       
        gl.uniform3fv(uColor, vec3(1.0,1.0,0.0));
       
        
        CUBE.draw(gl, objectProgram, mode); 
    }

    function arestaVertical(){

        
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
       
        gl.uniform3fv(uColor, vec3(1.0,0.7,0.0));
       
        
        CUBE.draw(gl, objectProgram, mode); 
    }

    function insideAresta(){

        
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
       
        gl.uniform3fv(uColor, vec3(0.0,0.0,1.0));
       
        
        CUBE.draw(gl, objectProgram, mode); 
    }

    

    function square(){
        pushMatrix();
            multTranslation([0,0,-(1/2-E1/2/L1)]);
            multScale([1,E1/L1,E1/L1]);
            aresta();
        popMatrix();
        pushMatrix();
            multTranslation([0,0,(1/2-E1/2/L1)]);
            multScale([1,E1/L1,E1/L1]);
            aresta();
        popMatrix();
        pushMatrix();
            multTranslation([(1/2-E1/2/L1),0,0]);
            multRotationY(90);
            multScale([1,E1/L1,E1/L1]);
            aresta();
        popMatrix();
        pushMatrix();
            multTranslation([-(1/2-E1/2/L1),0,0]);
            multRotationY(90);
            multScale([1,E1/L1,E1/L1]);
            aresta();
        popMatrix();
        
    }

    function insideSquare(){
        pushMatrix();
            multTranslation([0,0,-(1/2-E2/2/L2)]);
            multScale([1,E2/L2,E2/L2]);
            insideAresta();
        popMatrix();
        pushMatrix();
            multTranslation([0,0,(1/2-E2/2/L2)]);
            multScale([1,E2/L2,E2/L2]);
            insideAresta();
        popMatrix();
        pushMatrix();
            multTranslation([(1/2-E2/2/L2),0,0]);
            multRotationY(90);
            multScale([1,E2/L2,E2/L2]);
            insideAresta();
        popMatrix();
        pushMatrix();
            multTranslation([-(1/2-E2/2/L2),0,0]);
            multRotationY(90);
            multScale([1,E2/L2,E2/L2]);
            insideAresta();
        popMatrix();
    }

    function block(){
        pushMatrix();
            multScale([L1,L1,L1]);
            pushMatrix();
                multTranslation([0,-(1/2-E1/2/L1),0]);
                square();
            popMatrix();
            pushMatrix();
                multTranslation([0,(1/2-E1/2/L1),0]);
                square();
            popMatrix();
            pushMatrix();
                multTranslation([(1/2-E1/2/L1),0,(1/2-E1/2/L1)]);
                multRotationZ(90);
                multScale([(L1-E1)/L1,E1/L1,E1/L1]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([(1/2-E1/2/L1),0,-(1/2-E1/2/L1)]);
                multRotationZ(90);
                multScale([(L1-E1)/L1,E1/L1,E1/L1]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([-(1/2-E1/2/L1),0,-(1/2-E1/2/L1)]);
                multRotationZ(90);
                multScale([(L1-E1)/L1,E1/L1,E1/L1]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([-(1/2-E1/2/L1),0,(1/2-E1/2/L1)]);
                multRotationZ(90);
                multScale([(L1-E1)/L1,E1/L1,E1/L1]);
                arestaVertical();
            popMatrix();
        popMatrix();
    }

    function insideBlock(){
        pushMatrix();
            multScale([L2,L2,L2]);
            pushMatrix();
                multTranslation([0,-(1/2-E2/2/L2),0]);
                insideSquare();
            popMatrix();
            pushMatrix();
                multTranslation([0,(1/2-E2/2/L2),0]);
                insideSquare();
            popMatrix();
            pushMatrix();
                multTranslation([(1/2-E2/2/L2),0,(1/2-E2/2/L2)]);
                multRotationZ(90);
                multScale([(L2-E2)/L2,E2/L2,E2/L2]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([(1/2-E2/2/L2),0,-(1/2-E2/2/L2)]);
                multRotationZ(90);
                multScale([(L2-E2)/L2,E2/L2,E2/L2]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([-(1/2-E2/2/L2),0,-(1/2-E2/2/L2)]);
                multRotationZ(90);
                multScale([(L2-E2)/L2,E2/L2,E2/L2]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([-(1/2-E2/2/L2),0,(1/2-E2/2/L2)]);
                multRotationZ(90);
                multScale([(L2-E2)/L2,E2/L2,E2/L2]);
                arestaVertical();
            popMatrix();
        popMatrix();

    }

    function base(){
        
        for(let i=0;i<T1;i++){
            pushMatrix();
                multTranslation([0,i*(L1-E1/L1*L1)-(beginBasePosition)*(L1-E1/L1*L1),0]);
                block();
            popMatrix();
        }
    }

    function insideBase(){
        
        for(let i=0;i<T2;i++){
            pushMatrix();
                multTranslation([0,i*(L2-E2/L2*L2)-(beginInsideBasePosition)*(L2-E2/L2*L2),0]);
                insideBlock();
            popMatrix();
        }
        
    }

    function insideBaseAndCylinderAndViga(){
        pushMatrix();
            insideBase();
        popMatrix();
        pushMatrix();
            multTranslation([0, L3/2+cylinderHeight*2+(T2/2)*(L2-E2)-(1/2-E2/2),0]);
            vigaAndCylinder();
        popMatrix();
    }

    function cylinder(){

        multScale([cylinderRadius*2, cylinderHeight, cylinderRadius*2]);
  
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
         
        gl.uniform3fv(uColor, vec3(0.6,0.3,0));
         
          
        CYLINDER.draw(gl, objectProgram, mode); 
    }

    function triangle(){
        pushMatrix();
            multTranslation([0,0,-(1/2-E3/L3/2)]);
            multScale([1,E3/L3,E3/L3]);
            aresta();
        popMatrix();
        pushMatrix();
            multTranslation([-((1/3-E3/L3/3)-1/(Math.tan(62*Math.PI/180))),0,-E3/L3/6 ]);
            multRotationY(62);
            multScale([1,E3/L3,E3/L3]);
            aresta();
        popMatrix();
        pushMatrix();
            multTranslation([((1/3-E3/L3/3)-1/(Math.tan(62*Math.PI/180))),0,-E3/L3/6 ]);
            multRotationY(-62);
            multScale([1,E3/L3,E3/L3]);
            aresta();
        popMatrix();
        
        
        
    } 

    function trianglePrism(){
        pushMatrix();
            multScale([L3,L3,L3]);
            pushMatrix();
                multTranslation([0,0,-(1/2-E3/L3/2)]);
                multRotationX(-90);
                triangle();
            popMatrix();
            pushMatrix();
                multTranslation([0,0,(1/2-E3/L3/2)]);
                multRotationX(-90);
                triangle();
            popMatrix();
            pushMatrix();
                multTranslation([0,Math.sin(62*Math.PI/180)-(1/2-E3/L3/2),0]);
                multRotationY(90);
                multScale([(1-E3/L3),E3/L3,E3/L3]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([-(1/2-E3/L3/2),-(1/2-E3/L3/2),0]);
                multRotationY(90);
                multScale([(1-E3/L3),E3/L3,E3/L3]);
                arestaVertical();
            popMatrix();
            pushMatrix();
                multTranslation([(1/2-E3/L3/2),-(1/2-E3/L3/2),0]);
                multRotationY(90);
                multScale([(1-E3/L3),E3/L3,E3/L3]);
                arestaVertical();
            popMatrix();
        popMatrix();
    }

    function viga(){
        for(let i = 0; i<numElemsViga; i++){
            pushMatrix();
                multTranslation([0,0,-(numElemsViga/2-0.5)*L3+i*L3]);
                trianglePrism();
            popMatrix();
        }
        
    }

    function vigaAndCarAndCube(){
        pushMatrix();
            viga();
        popMatrix();
        pushMatrix();       
            multTranslation([0, -L3,-(numElemsViga/2-numTriangleBlocksForCube/2)*L3]);
            cube();
        popMatrix();
        pushMatrix();
            multTranslation([0, -(L3/2+0.1/2),carMove]);
            carAndHook();
        popMatrix();
    }

    function vigaAndCylinder(){
        pushMatrix();
            multRotationY(vigaRotation);
            pushMatrix();
            multTranslation([0,0,(numElemsViga/2-numTriangleBlocksForCube)*L3-cylinderRadius]);
                vigaAndCarAndCube();
            popMatrix();
            pushMatrix();
            multTranslation([0, -L3/2-cylinderHeight/2,0]);
                cylinder();
            popMatrix();
        popMatrix();
    }

    function cube(){

         multScale([L3, L3, L3]);
  
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
         
        gl.uniform3fv(uColor, vec3(1,1,1));
         
          
        CUBE.draw(gl, objectProgram, mode); 
    }

    function car(){

        multScale([L3, 0.1, L3]);

        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
       
        gl.uniform3fv(uColor, vec3(1,0,0));
       
        
        CUBE.draw(gl, objectProgram, mode); 
    }

    function hook(){

        multScale([0.1, hookLength, 0.1]);
  
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
       
        gl.uniform3fv(uColor, vec3(1,1,1));
       
        
        CUBE.draw(gl, objectProgram, mode); 
    }


    function ganchoCylinder(){

         multScale([L3/2, L3/2, L3/2]);
  
         uploadModelView();
         const uColor = gl.getUniformLocation(objectProgram,"uColor");
        
         gl.uniform3fv(uColor, vec3(0.8,0.1,0.1));
        
         
         CYLINDER.draw(gl, objectProgram, mode); 
    }

    function ganchoSphere(){

        multScale([L3/2, L3/2, L3/2]);
 
        uploadModelView();
        const uColor = gl.getUniformLocation(objectProgram,"uColor");
       
        gl.uniform3fv(uColor, vec3(0.8,0.1,0.1));
       
        
        SPHERE.draw(gl, objectProgram, mode); 
   }

    function ganchoTop(){
        pushMatrix()
            multTranslation([0,L3/4,0]);
            pushMatrix();  
                ganchoSphere(); 
            popMatrix();
            pushMatrix();
                multTranslation([0,L3/4,0]);  
                ganchoCylinder(); 
            popMatrix();
        popMatrix();
    }

    function redCube(){

         multScale([L3, L3/8, L3/8]);
  
         uploadModelView();
         const uColor = gl.getUniformLocation(objectProgram,"uColor");
        
         gl.uniform3fv(uColor, vec3(0.75,0.15,0.15));
        
         
         CUBE.draw(gl, objectProgram, mode); 
    }

    function garraEsquerda(){
        pushMatrix();
            multTranslation([L3/2,0,0]);
            redCube();
        popMatrix();
        pushMatrix();
            multTranslation([L3+L3/4,L3*2/5,0]);
            multRotationZ(55);
            redCube();
        popMatrix();
    }

    function garraCompleta(){
        pushMatrix();
            multRotationZ(-145+closeGarra);
            garraEsquerda();
        popMatrix();
        pushMatrix();
            multRotationZ(-35-closeGarra);
            multScale([1,-1,1]);
            garraEsquerda();
        popMatrix();
    }

    function ganchoCompleto(){
        pushMatrix();
            ganchoTop()
        popMatrix();
        pushMatrix();
            garraCompleta();
        popMatrix();
    }

    function carAndHook(){
        pushMatrix();
            car();
        popMatrix();
        pushMatrix();
            multTranslation([0,-hookLength/2,0]);
            hook();
        popMatrix();
        multTranslation([0,-hookLength,0]);
        multTranslation([0,-L3/2*1.5,0]);
        ganchoCompleto();
    }


    function world(){
        pushMatrix();
            multTranslation([0,-tileHeight/2,0]);
            floor();
        popMatrix();
        pushMatrix();
            multTranslation([0,T1/2*(L1-E1)+E1/2,0]);
            base();
        popMatrix();
        pushMatrix();
            multTranslation([0,level,0]);
            multTranslation([0,T2/2*(L2-E2)+E2/2,0]);
            insideBaseAndCylinderAndViga();
        popMatrix();
        pushMatrix();
            drawCargas();
        popMatrix();
    
       
       
    }
    spawnCarga();
    function drawCargas(){

        for(let i = 0; i<cargas.length; i++){
            pushMatrix();
                multTranslation([cargas[i].position[0],cargas[i].position[1]+0.5*L3,cargas[i].position[2]]);
                multRotationY(cargas[i].orientation);
                multScale([L3,L3,L3]);
                uploadModelView(); 
                
                const uColor = gl.getUniformLocation(objectProgram,"uColor");
            
                gl.uniform3fv(uColor, cargas[i].color);
                switch(cargas[i].type){
                    case "cube":                                                              
                        CUBE.draw(gl, objectProgram, mode); 
                    break;
                    case "cylinder":
                        CYLINDER.draw(gl, objectProgram, mode); 
                    break;
                    case "pyramid":
                        PYRAMID.draw(gl, objectProgram, mode); 
                    break;
                    
                }
            popMatrix();
        }
        
    }


    function render(milisec)
    {
       

        if(time==0){
            time =milisec/1000;
        }else{
            lastFrame=milisec/1000-time;
            time =milisec/1000;
        }
        if (droping && closeGarra>10)
            closeGarra-=0.50;
        else{
            droping= false;
        }
        

        if (catching && closeGarra<25)
            closeGarra+=0.50;
        else{
            catching= false;
        }
        
        
        
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        gl.useProgram(objectProgram);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(objectProgram, "mProjection"), false, flatten(mProjection));

        fisicLaws();
    

        loadMatrix(mview);
        pushMatrix();
            multScale([zoom,zoom,zoom]); 
            world();
        popMatrix();
       
    }
}

const urls = ["shader.vert", "shader.frag","shaderObjects.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
