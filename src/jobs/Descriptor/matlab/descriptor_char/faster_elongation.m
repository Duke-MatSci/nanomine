function [er, erlist]=faster_elongation(image)
%--------------------------------------------------------------------------
% Hongyi Xu, IDEAL Lab, Northwestern University
% This function is to calculate the elongation ratio. It is extremely fast
% because inplanted functions of MATLAB are used here to substitute the
% clustermark function. 
% INPUT: 
% 2D image, any binary image, background should be 0;
% OUTPUT: 
% er, average elongation ratio.
% erlist, the list of all elongation ratios
% P.S.: Another characterization parameter, "averge compactness", see 
% function "nh_ch.m".
%--------------------------------------------------------------------------
er=0;
erlist = [];
image=double(image); % Binary image! Background is 0!
image=ceil(image./1000);
img=bwlabel(image);
angles=regionprops(logical(img),'Orientation');
ClusterNo=max(max(img));

for ii=1:1:ClusterNo 
    % Pick out a cluster. It is a 2 column matrix, representing X,Y
    % coordinate values respectively.
    [l,c]=find(img==ii);
    a=[l,c];
    % Pick out the angle of the this cluster.
    ang=angles(ii).Orientation;
    ang=ang/180*pi;
    % Calculate the coordinates of the cluster after rotate it to make the
    % orientation axis coincide with x-axis. Rotate matrix used here is
    % clockwise.
    rotate=a*[cos(ang)  -sin(ang); sin(ang)   cos(ang)];
    max_x=max( rotate(:,1) );
    min_x=min( rotate(:,1) );
    max_y=max( rotate(:,2) );
    min_y=min( rotate(:,2) );
    % the elongation ratio of this Single cluster
    elongation_S=abs( ( max_x-min_x+1 )/( max_y-min_y+1 ) );
    if elongation_S > 1
        elongation_S = 1/elongation_S;
    end
    erlist = [ erlist; elongation_S];
    er=er+elongation_S;
end
er=er/ClusterNo;