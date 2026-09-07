export const stdVS = `varying vec3 vN,vWP,vV;void main(){vN=normalize(normalMatrix*normal);vWP=(modelMatrix*vec4(position,1.)).xyz;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;

export const glslNoise = `float cN(vec2 p,float t){vec2 u1=p*.025+vec2(t*.06,t*.03),u2=p*.05-vec2(t*.04,t*.07);return smoothstep(.2,.85,(sin(u1.x*3.14+cos(u1.y*2.7))*cos(u1.y*3.14+sin(u1.x*2.1))*.5+.5)*.65+(sin(u2.x*2.8+u2.y*1.9)*cos(u2.y*3.2-u2.x*1.5)*.5+.5)*.35);}`;

export const glslGround = `${glslNoise}vec3 gCol(vec2 p,float t,float a){float c=cN(p,t);vec3 gA=mix(vec3(.04,.2,.06),vec3(.16,.38,.14),c),gG=mix(vec3(.08,.08,.1),vec3(.18,.18,.22),c),gF=mix(gG,gA,a),gi=mix(vec3(.55,.58,.7),vec3(.72,.54,.7),a)*1.35;return gF*mix(gi,vec3(1.22,1.14,1.02),c*.42+.58);}`;

export const glslRainbow = `vec3 rb(float t){return vec3(.5,.5,.5)+vec3(.5,.5,.5)*cos(6.283*(vec3(t,t,t)+vec3(0.,.33,.67)));}`;
