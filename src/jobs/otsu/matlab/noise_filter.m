function img1 = noise_filter(img, min_radius)
%========================================%
% the function is designed to find the clusters whose size is less than the
% minimum particle size 
​
%Written By Akshay Iyer
%Northwestern University
​
%Variables:
%img: binarized img
%resl: minimum cluster radius
​
%label the clusters
img_b = bwlabel(img);
nh = max(max(img_b));
​
%examine the cluster with the criteria
for ii = 1 : 1 : nh
    img_S = double (img_b == ii);
    area = sum(sum(img_S));
    if area < pi*(min_radius^2)
        img_b = img_b - img_S * ii;
    end
        
    
end
​
img1 = double(img_b > 0);
​
end