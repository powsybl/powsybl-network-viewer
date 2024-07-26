#version 300 es
#define SHADER_NAME arrow-layer-vertex-shader

precision highp float;

in vec3 positions;
in float instanceSize;
in vec4 instanceColor;
in float instanceSpeedFactor;
in float instanceArrowDistance;
in float instanceArrowDirection;
in float instanceLineDistance;
in int instanceLinePositionsTextureOffset;
in int instanceLineDistancesTextureOffset;
in int instanceLinePointCount;
in float instanceLineParallelIndex;
in vec3 instanceLineAngles;
in vec2 instanceProximityFactors;
in float instanceDistanceBetweenLines;

uniform float sizeMinPixels;
uniform float sizeMaxPixels;
uniform float timestamp;
uniform sampler2D linePositionsTexture;
uniform sampler2D lineDistancesTexture;
uniform float maxParallelOffset;
uniform float minParallelOffset;
uniform float opacity;
uniform ivec2 linePositionsTextureSize;

uniform ivec2 lineDistancesTextureSize;

out vec4 vFillColor;
out float shouldDiscard;

/**
 * Calculate 2 dimensions texture index from flat index. 
 */
ivec2 calculateTextureIndex(int flatIndex, ivec2 textureSize) {
  return ivec2(flatIndex % textureSize.x, flatIndex / textureSize.x);
}

/**
 * Fetch WGS84 position from texture for a given point of the line.  
 */
vec3 fetchLinePosition(int point) {
  int flatIndex = instanceLinePositionsTextureOffset + point;
  ivec2 textureIndex = calculateTextureIndex(flatIndex, linePositionsTextureSize); 
  return vec3(texelFetch(linePositionsTexture, textureIndex, 0).xy, 0);
}

/**
 * Fetch distance (in meters from the start of the line) from texture for a point of the line.  
 */
float fetchLineDistance(int point) {
  int flatIndex = instanceLineDistancesTextureOffset + point;
  ivec2 textureIndex = calculateTextureIndex(flatIndex, lineDistancesTextureSize);
  return texelFetch(lineDistancesTexture, textureIndex, 0).x;
}

/**            
 * Find the first point of the line that is after a given distance from the start (first line point).
 * (implemented using a binary search)
 * The returned value is always between 1 and instanceLinePointCount - 1, even if the searched distance is out of bounds
 * Here are example returned values for a path having points at distance 0.0, 10.0, 20.0
 * -1 => 1
 *  0 => 1
 *  1 => 1
 *  9 => 1
 *  10 => 2
 *  11 => 2
 *  19 => 2
 *  20 => 2
 *  21 => 2
 */
int findFirstLinePointAfterDistance(float distance) {
  int firstPoint = 0;
  int lastPoint = instanceLinePointCount - 1;
  
  // variable length loops are not supported in GLSL, instanceLinePointCount is an upper bound that
  // will never be reached as binary search complexity is in O(log(instanceLinePointCount))
  for (int i = 0; i < instanceLinePointCount; i++) {
      if (firstPoint + 1 == lastPoint) {
          return lastPoint; 
      }   
      int middlePoint = (firstPoint + lastPoint) / 2;           
      float middlePointDistance = fetchLineDistance(middlePoint);      
      if (middlePointDistance <= distance) {
         firstPoint = middlePoint;
      } else {
         lastPoint = middlePoint;                            
      }  
  }   
}

mat3 calculateRotation(vec3 commonPosition1, vec3 commonPosition2) {
  float angle = atan(commonPosition1.x - commonPosition2.x, commonPosition1.y - commonPosition2.y);
  if (instanceArrowDirection < 2.0) {
      angle += radians(180.0);
  }
  return mat3(cos(angle),  sin(angle),  0,
              -sin(angle), cos(angle),  0,
              0,           0,           0);
}

/**
 * Adjustment factor for low zoom levels
 * Code from deck.gl/modules/core/src/shaderlib/project/project.glsl.ts. We don't have access to this method from here. 
 * Just to call it from project_size_all_zoom_levels().
 * Function renamed to project_size_at_latitude_low_zoom, to prevent conflicts with the original code.
 */
float project_size_at_latitude_low_zoom(float lat) {
  float y = clamp(lat, -89.9, 89.9);
  return 1.0 / cos(radians(y));
}

/**
 * Forked version of project_size() from deck.gl deck.gl/modules/core/src/shaderlib/project/project.glsl.ts
 * Converts the size from the world space (meters) to the common space.
 * When the zoom level is lower than 12 (zoomed out), we use the arrow latitude to calculate the projection. 
 * When the zoom level is higher than 12 (zoomed in), we fallback on the standard deck.gl project_size() which uses geometry.position.y. 
 * I'm not sure why there is a change at zoomLevel = 12, but there seem to be some optimizations on the deck.gl side
 * (see: https://github.com/visgl/deck.gl/blob/401d624c0529faaa62125714c376b3ba3b8f379f/dev-docs/RFCs/v6.1/improved-lnglat-projection-rfc.md?plain=1#L29)
 */
float project_size_all_zoom_levels(float meters, float lat) {
   // We use project_uScale = 4096 (2^12) which corresponds to zoom = 12 
   if (project_uScale < 4096.0) { 
    return meters * project_uCommonUnitsPerMeter.z * project_size_at_latitude_low_zoom(lat);
  }
  return project_size(meters);
}

void main(void) {
  if (instanceArrowDirection < 1.0) {
      vFillColor = vec4(0, 0, 0, 0);
      shouldDiscard = 1.0;
  } else {
      // arrow distance from the line start shifted with current timestamp
      // instanceArrowDistance: a float in interval [0,1] describing the initial position of the arrow along the full path between two substations (0: begin, 1.0 end)
      float arrowDistance = mod(instanceLineDistance * instanceArrowDistance + (instanceArrowDirection < 2.0 ? 1.0 : -1.0) * timestamp * instanceSpeedFactor, instanceLineDistance);
    
      // look for first line point that is after arrow distance
      int linePoint = findFirstLinePointAfterDistance(arrowDistance);
    
      // Interpolate the 2 line points position
      float lineDistance1 = fetchLineDistance(linePoint - 1);
      float lineDistance2 = fetchLineDistance(linePoint);
      float interpolationValue = (arrowDistance - lineDistance1) / (lineDistance2 - lineDistance1);
      
      // position for the line point just before the arrow
      vec3 linePosition1 = fetchLinePosition(linePoint - 1);
    
      // position for the line point just after the arrow
      vec3 linePosition2 = fetchLinePosition(linePoint);
    
      // clamp to arrow size limits
      float sizePixels = clamp(project_size_to_pixel(instanceSize), sizeMinPixels, sizeMaxPixels);

      // project the 2 line points position to common space 
      vec3 position64Low = vec3(0, 0, 0);
      vec3 commonPosition1 = project_position(linePosition1, position64Low);
      vec3 commonPosition2 = project_position(linePosition2, position64Low);

      // We call our own project_size_all_zoom_levels() instead of project_size() from deck.gl as the latter causes a bug: the arrows
      // are not correctly positioned on the lines, they are slightly off. 
      // This hack does not seem necessary for parallel-path or fork-line layers.
      vec3 arrowPositionWorldSpace = mix(linePosition1, linePosition2, interpolationValue);
      float offsetCommonSpace = clamp(project_size_all_zoom_levels(instanceDistanceBetweenLines, arrowPositionWorldSpace.y), project_pixel_size(minParallelOffset), project_pixel_size(maxParallelOffset));

      // calculate translation for the parallels lines, use the angle calculated from origin/destination
      // to maintain the same translation between segments
      float instanceLineAngle1 = instanceLineAngles[1]; 
      float instanceLineAngle2 = instanceLineAngles[1]; 
      if( linePoint == 1 ){
        instanceLineAngle1 = instanceLineAngles[0];
      }
      if ( linePoint == int(instanceLinePointCount)-1 ){
        instanceLineAngle2 = instanceLineAngles[2];
      }      
      vec3 transOr = vec3(cos(instanceLineAngle1), -sin(instanceLineAngle1),0.) * instanceLineParallelIndex;      
      if(linePoint == 1) {
          transOr.x -= sin(instanceLineAngle1) * instanceProximityFactors[0];
          transOr.y -= cos(instanceLineAngle1) * instanceProximityFactors[0];
      }
      commonPosition1 += transOr * offsetCommonSpace;
      vec3 transEx = vec3(cos(instanceLineAngle2), -sin(instanceLineAngle2),0.) * instanceLineParallelIndex;
      if (linePoint == int(instanceLinePointCount)-1) {
          transEx.x += sin(instanceLineAngle2) * instanceProximityFactors[1];
          transEx.y += cos(instanceLineAngle2) * instanceProximityFactors[1];
      }
      commonPosition2 += transEx * offsetCommonSpace;

      // calculate arrow position in the common space by interpolating the 2 line points position
      vec3 arrowPosition = mix(commonPosition1, commonPosition2, interpolationValue);

      // calculate rotation angle for aligning the arrow with the line segment
      // it has to be done in the common space to get the right angle!!!
      mat3 rotation = calculateRotation(commonPosition1, commonPosition2);

      // calculate vertex position in the clipspace
      vec3 offset = positions * project_pixel_size(sizePixels) * rotation;
      vec4 vertexPosition = project_common_position_to_clipspace(vec4(arrowPosition + offset, 1));

      // vertex shader output
      gl_Position = vertexPosition;

      // arrow fill color for fragment shader 
      vFillColor = vec4(instanceColor.rgb, opacity);
      shouldDiscard = 0.0;
  }
}