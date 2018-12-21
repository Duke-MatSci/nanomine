function cord = ThreeD2Coordinate(img)
% This function transforms the 3D 0-1 structure matrix into 3*n coordinate
% matrix, which is feeded into the 'voxel_image.m' for plotting.
% The input "image", should be a 3D matrix, in which 1 means the
% inclusions, and 0 means the matrix (background).
[L, W, D] = size(img);
cord = [];
for ii = 1:1:D
    temp = img(:,:,ii);
    [x,y,z] = find(temp);
    leng = length(x);
    z = ones(leng,1);
    z = z * ii;
    cord = [cord ; [x,y,z] ];
end