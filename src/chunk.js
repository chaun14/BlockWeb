import Shader from "./shader.js";
import Texture from "./texture.js";
import Buffer from "./buffer.js";

let vert = `
	uniform mat4 proj;
	uniform mat4 view;
	uniform vec3 sun;
	attribute vec3 pos;
	attribute vec3 norm;
	attribute vec2 uv;
	varying mediump vec2 vUv;
	varying mediump float factor;
	
	void main()
	{
		gl_Position = proj * view * vec4(pos, 1);
		vUv = uv;
		factor = max(0.0, dot(sun, norm)) * 0.5 + 0.5;
	}
`;

let frag = `
	uniform sampler2D tex;
	varying mediump vec2 vUv;
	varying mediump float factor;
	
	void main()
	{
		gl_FragColor = texture2D(tex, vUv);
		gl_FragColor.rgb *= factor;
	}
`;

export default class Chunk
{
	constructor(display)
	{
		this.shader = new Shader(display, vert, frag);
		this.texture = new Texture(display, "gfx/blocks.png");
		this.buffer = new Buffer(display);
		this.data = new Uint8Array(16 * 16 * 256);
		this.count = 0;
		
		for(let z=0, i=0; z<256; z++) {
			for(let y=0; y<16; y++) {
				for(let x=0; x<16; x++, i++) {
					this.data[i] = z > y ? 0 : 1;
				}
			}
		}
		
		this.gl = display.gl;
		this.display = display;
	}
	
	getBlock(x, y, z)
	{
		if(x >= 0 && y >= 0 && z >= 0 && x < 16 && y < 16 && z < 256) {
			return this.data[x + y * 16 + z * 16 * 16];
		}
		
		return 0;
	}
	
	remesh()
	{
		let gl = this.gl;
		let mesh = [];
		
		this.remeshSide(mesh, -1, 0, 0, [0,1,0], [0,0,0], [0,1,1], [0,0,1]);
		this.remeshSide(mesh,  0,-1, 0, [0,0,0], [1,0,0], [0,0,1], [1,0,1]);
		this.remeshSide(mesh,  0, 0,-1, [0,1,0], [1,1,0], [0,0,0], [1,0,0]);
		this.remeshSide(mesh, +1, 0, 0, [1,0,0], [1,1,0], [1,0,1], [1,1,1]);
		this.remeshSide(mesh,  0,+1, 0, [1,1,0], [0,1,0], [1,1,1], [0,1,1]);
		this.remeshSide(mesh,  0, 0,+1, [0,0,1], [1,0,1], [0,1,1], [1,1,1]);
		
		this.buffer.update(new Float32Array(mesh));
		this.count = mesh.length / 8;
	}
	
	remeshSide(mesh, nx, ny, nz, p0, p1, p2, p3)
	{
		for(let z=0, i=0; z<256; z++) {
			for(let y=0; y<16; y++) {
				for(let x=0; x<16; x++, i++) {
					let block = (
						this.getBlock(x, y, z) > 0 && this.getBlock(x + nx, y + ny, z + nz) === 0
						? this.getBlock(x, y, z)
						: 0
					);
					
					if(block > 0) {
						let v0 = [x + p0[0], y + p0[1], z + p0[2], nx, ny, nz, 0/16, 1/16];
						let v1 = [x + p1[0], y + p1[1], z + p1[2], nx, ny, nz, 1/16, 1/16];
						let v2 = [x + p2[0], y + p2[1], z + p2[2], nx, ny, nz, 0/16, 0/16];
						let v3 = [x + p3[0], y + p3[1], z + p3[2], nx, ny, nz, 1/16, 0/16];
						
						mesh.push(...v0, ...v1, ...v2, ...v2, ...v1, ...v3);
					}
				}
			}
		}
	}
	
	draw(camera, sun)
	{
		let shader = this.shader;
		
		shader.assignFloatAttrib("pos",  this.buffer, 3, 8, 0);
		shader.assignFloatAttrib("norm", this.buffer, 3, 8, 3);
		shader.assignFloatAttrib("uv",   this.buffer, 2, 8, 6);
		shader.use();
		shader.assignMatrix("proj", camera.proj);
		shader.assignMatrix("view", camera.view);
		shader.assignVector("sun", sun);
		shader.assignTexture("tex", this.texture, 0);
		
		this.display.drawTriangles(this.count);
	}
}
