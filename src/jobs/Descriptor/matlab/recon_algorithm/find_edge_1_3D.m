function C = find_edge_1_3D(image)
% Find the "1" edge voxels in 3D 0-1 image
% 4/8/2013
pixel = length(image);
% find the locations of edges
image_ext = zeros([pixel+2 pixel+2 pixel+2]); % expanded image
image_ext(2:pixel+1,2:pixel+1,2:pixel+1) = image;
image_tmp = 6*image - image_ext(1:pixel,2:pixel+1,2:pixel+1) - image_ext(3:pixel+2,2:pixel+1,2:pixel+1)...
                    - image_ext(2:pixel+1,1:pixel,2:pixel+1) - image_ext(2:pixel+1,3:pixel+2,2:pixel+1)...
                    - image_ext(2:pixel+1,2:pixel+1,1:pixel) - image_ext(2:pixel+1,2:pixel+1,3:pixel+2);

% in image_tmp
% +: "1" edge
% -: "0" edge
% 0: white/black interior
[xl, yl, zl] = ind2sub( size(image_tmp),find(image_tmp > 0) );  % Highlight: how to "find" the coordinates in 3D matrix

C = [xl, yl, zl];
