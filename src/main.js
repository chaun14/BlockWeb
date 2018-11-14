import {Display} from "./display.js";
import {Camera} from "./camera.js";
import {Chunk} from "./chunk.js";
import {Input} from "./input.js";
import * as matrix from "./matrix.js";

let display = new Display();
let camera = new Camera(display);
let gl = display.gl;
let chunk = new Chunk(display);
let input = new Input(display.canvas);

document.body.appendChild(display.canvas);

let shader = display.createShader(`
	uniform mat4 proj;
	uniform mat4 view;
	uniform mat4 model;

	attribute vec4 pos;
	attribute vec2 texcoord;
	
	varying vec2 vTexcoord;
	
	void main()
	{
		gl_Position = proj * view * model * pos;
		
		vTexcoord = texcoord;
	}
`,`
	precision highp float;
	
	uniform sampler2D tex;
	
	varying vec2 vTexcoord;
	
	void main()
	{
		gl_FragColor = texture2D(tex, vTexcoord);
	}
`);

let angle = 0.0;
let atlas = display.createTexture("gfx/atlas.png");
let model = matrix.identity();
let speed = 0.1;

display.onRender = () => {
	if(input.keymap.a) {
		camera.moveLeft(speed);
	}
	if(input.keymap.d) {
		camera.moveRight(speed);
	}
	if(input.keymap.s) {
		camera.moveBackward(speed);
	}
	if(input.keymap.w) {
		camera.moveForward(speed);
	}
	if(input.keymap.shift) {
		camera.moveUp(speed);
	}
	if(input.keymap.space) {
		camera.moveDown(speed);
	}
	
	shader.use();
	
	shader.uniformMatrix4fv("proj", camera.getProjection());
	shader.uniformMatrix4fv("view", camera.getView());
	
	drawTriangles(chunk.buf,  16 ** 3 * 6 * 2 * 3,  0,0,3,  0,  atlas);
}

input.onMove = e => {
	if(input.panning) {
		camera.turnHori(e.movementX / 100);
		camera.turnVert(-e.movementY / 100);
	}
};

function drawTriangles(buf, vertnum, x, y, z, a, tex)
{
	matrix.translation(x, y, z, model);
	matrix.rotateX(model, a, model);
	matrix.rotateY(model, a, model);
	
	shader.uniformMatrix4fv("model", model);
	shader.uniformTex("tex", tex, 0);
	
	shader.vertexAttrib("pos",      buf, 4, 6, 0);
	shader.vertexAttrib("texcoord", buf, 2, 6, 4);
	
	gl.drawArrays(gl.TRIANGLES, 0, vertnum);
}

window.display = display;
window.camera = camera;
