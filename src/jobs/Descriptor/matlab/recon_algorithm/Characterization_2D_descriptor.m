function [ VF, N, ncd, areas, asp ] = Characterization_2D_descriptor(image)
% -------------------------------------------------------------------------
% This function calculate four descriptors (mean) from a binary image
% Input:    binary image, 1 is filler, 0 is matrix
% Output:   mean of four descriptors
% VF:       volume fraction
% N:        number of filler clusters
% ncd:      nearest center distances (between all filler clusters)
% asp:      aspect ratio
% Subfunctions used: 
% nearest_center_distance.m
% faster_elongation.m
%
% By Hongyi Xu: hongyixu2014@u.northwestern.edu
% -------------------------------------------------------------------------
L = length(image);
VF = sum( image(:) )/L^2;
cimg = bwlabel(image);
N = max( cimg(:) );

areas = zeros(N,1);
for ii = 1:1:N
    timg = double(cimg == ii);
    areas(ii) = sum(timg(:));
end

[~, ~, ncd] = nearest_center_distance(image);
[~, asp] = faster_elongation(image);