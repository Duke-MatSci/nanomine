function [conn, deg_concave] = check_shape(img)  % 2D
% Henry Zhang 2019/07 IDEAL, NU
% Nanocomposite: binary image with 0 for matrix and 1 for filler
%   output is the connectivity of matrix, and the concavity of filler
img_rev = ~img;
conn_mat = floor(connectivity(img_rev));
conn_fil = floor(connectivity(img));
conn = [conn_mat, conn_fil];

regions = regionprops(logical(img), 'Image');
num_regions = numel(regions);
% Concavity of fillers. N/A if filler is connected.
deg_concave = zeros(num_regions, 1);

% This can be calculated directly by "Solidity" in regionprops
for i = 1:num_regions
    cur_img = regions(i).Image;
    cur_convex = regionprops(cur_img, 'ConvexArea');
    if sum(cur_img(:)) > 4
        deg_concave(i) = cur_convex.ConvexArea / sum(cur_img(:));
    end
end

deg_concave = deg_concave(deg_concave > 0);
deg_concave = mean(deg_concave);

end


function conn = connectivity(img)
% Check the connectivity of "1" pixels in a binary image
cc = bwconncomp(img);
filtered = 0;
largest = 0;
for i = 1:length(cc.PixelIdxList)
    cur_size = size(cell2mat(cc.PixelIdxList(i)), 1);
    if cur_size < 4
        filtered = filtered + 1;
    end
    if cur_size > largest
        largest = cur_size;
    end
end
conn = 1 / (cc.NumObjects - filtered);
% Largest cluster contain 80% of matter -> connected
if largest > 0.8 * sum(img(:))
    conn = 1;
end

end
