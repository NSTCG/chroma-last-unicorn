export const stdVS = `varying vec3 vN,vWP,vV;void main(){vN=normalMatrix*normal;vWP=(modelMatrix*vec4(position,1.)).xyz;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;

export const glslNoise = `float cN(vec2 p,float t){vec2 u1=p*.025+vec2(t*.06,t*.03);return smoothstep(.2,.85,(sin(u1.x*3.14+cos(u1.y*2.7))*cos(u1.y*3.14+sin(u1.x*2.1))*.5+.5));}`;

export const glslGround = `${glslNoise}vec3 gCol(vec2 p,float t,float a){float c=cN(p,t);vec3 gA=mix(vec3(.04,.2,.06),vec3(.16,.38,.14),c),gG=mix(vec3(.08),vec3(.2),c);return mix(gG,gA,a)*mix(mix(vec3(.7,.7,.9),vec3(.9,.7,.9),a),vec3(1.2,1.1,1.),c*.4+.6);}`;

export const glslRainbow = `vec3 rb(float t){return vec3(.5)+vec3(.5)*cos(6.283*(vec3(t)+vec3(0.,.33,.67)));}`;
