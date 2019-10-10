function [nh, ch, ar, rc]=faster_nh_ch(img)
%--------------------------------------------------------------------------
% Hongyi Xu, IDEAL Lab, Northwestern Univeristy
% The revised version for Statistical Learning package
%
% This function is to calclate the n(h) and c(h) in a much faster way
% compared with previous code "nh_ch". This is faster because it use the
% inplanted functions of MATLAB. And the perimeter caculation method is
% also revised (no longer use the search method, use a much smarter 
% approach).
% INPUTS:
% "image": colored image
% OUTPUTS:
% "nh": # of clusters. 1st column is it; 2nd column is grey level value;
% "ch": compactness.
% "ar": area
% "rc": equivalent radius
% NOTICE: here n(h) and N(h) are considered as the same. They are not the
% same in fact, but have no influence on finding the peak's x-coordinate
%--------------------------------------------------------------------------
[height,width]=size(img);
nh = max(max(img));
ch = zeros( max(img(:)) , 1 );
ar = zeros( max(img(:)) , 1 );
rc = zeros( max(img(:)) , 1 );

for ii=1:1:nh
    
    if mod(ii,500) == 0
        disp(nh-ii);
    end
    
%     img_S=abs(img-ii);
%     img_S=ceil(img_S/1000); % img_S is the image have only 1 cluster
%     img_S=abs(img_S-1);
    img_S = double( img == ii );
    
    Lx=zeros(height,1);
    Ly=zeros(1,width);
    
    % peri is the perimeter of this cluster
    peri=sum(  sum( abs(   [Lx, img_S] - [img_S, Lx]     ) )  ) + ...
        sum(  sum( abs(  [Ly; img_S] - [img_S; Ly]  ) )  );
    
    % area is the area of this cluster
    area = sum(sum(img_S));
    ar(ii) = area;
    
    ch(ii) = sqrt(area)/peri;
    
    rc(ii) = sqrt( area/pi );
    
end
% ch = 2*sqrt(pi).*ch;
