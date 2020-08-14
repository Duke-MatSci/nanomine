function img1 = noise_filter(img, resl);
%========================================%
% the function is designed to find the clusters whose size is less than the
% minimum particle size 

%Xiaolin Li
%Sept. 22, 2014
%Northwestern University

%Variables:
%img: binarized img
%resl: images resolution

%Here we take 15nm as the minimum siz of a single particle
%========================================%
%Convertor

%60K, 200nm = 146 pixels
%80K, 200nm = 195 pixels
%100K, 100nm = 122 pixels
%150K, 100nm = 183 pixels
%300L, 50nm = 183 pixels
%========================================%
% find the corresponding equivalent radius
switch resl
%     case 1
%         r = 1;
    case 60
       r = 5.475;
    case 80
       r = 7.3125;
    case 100
       r = 9.15;
    case 150
       r = 13.725;
    case 300
       r = 54.9;
end
%label the clusters
img_b = bwlabel(img);
nh = max(max(img_b));

%examine the cluster with the criteria
for ii = 1 : 1 : nh
    img_S = double (img_b == ii);
    area = sum(sum(img_S));
    if area < pi*(r^2)
        img_b = img_b - img_S * ii;
    end
        
    
end

img1 = double(img_b > 0);

end