function [er, erlist, orintation_ang, rectangularity]=faster_elongation_II(image)
%--------------------------------------------------------------------------
% Hongyi Xu, IDEAL Lab, Northwestern University
% Revised on 4/30/2013
%
% What is added: 
% - Orintation_ang 
% - Rectangularity
%
% This function is to calculate the elongation ratio. It is extremely fast
% because inplanted functions of MATLAB are used here to substitute the
% clustermark function. 
% INPUT: 
% 2D image, colored image
% OUTPUT: 
% er, average elongation ratio.
% erlist, the list of all elongation ratios
% orintation_ang, the list of orintations of each cluster, in radius
% rectangularity, rectangularity list of the clusters
%
% P.S.: Another characterization parameter, "averge compactness", see 
% function "nh_ch.m".
%--------------------------------------------------------------------------
er=0;
erlist = [];
% image=double(image); % Binary image! Background is 0!
% image=ceil(image./1000);
% img=bwlabel(image);
img = image;
angles=regionprops(logical(img),'Orientation');
ClusterNo=max(max(img));

orintation_ang = [];
rectangularity = [];
tortousity = [];

for ii=1:1:ClusterNo 
    % Pick out a cluster. It is a 2 column matrix, representing X,Y
    % coordinate values respectively.
    [l,c]=find(img==ii);
    a=[l,c];
    
    area = length(a);
    
    % Pick out the angle of the this cluster.
    ang=angles(ii).Orientation;
    ang=ang/180*pi;
    orintation_ang = [ orintation_ang; ang];
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
    erlist = [ erlist; elongation_S];
    er=er+elongation_S;
    
    trec = area/( ( max_x - min_x )*( max_y - min_y ) );
    
    if trec == Inf 
        trec = 1;
    end
    
    rectangularity = [ rectangularity; trec ];
    
    
end
er=er/ClusterNo;
