function [As] = area_stat(image)
% -------------------------------------------------------------------------
% Calculate the area of each cluster
% INPUT: 2D image, any binary image, background should be 0;
% OUTPUT: As, list of cluster areas.
% Feel free to expand the code for other statistics
% -------------------------------------------------------------------------
timg = bwlabel(image);
cnt = max(max(timg));
As = [];
for ii = 1:1:cnt
    a = length( find(timg == ii) );
    As = [As; a];
end