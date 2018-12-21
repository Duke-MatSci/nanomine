function [As, el, ellist, nda, nd] = overlap_particle_calc( Bimg , Clist )
% Written by Hongyi Xu, Northwestern U
% BACKGROUND:
% For High VF image, identify the elongation ratios for particles.
% The task is originated from Goodyear project, where we cannot tell
% particles apart in one cluster, due to the high VF and low resolution.
% INPUT:
% - Bimg:   binary image. "1" is the inclusions, "0" is the background
% - Clist:  list of the particle centers' X-Y coordinates
% METHOD:
% Identify and throw away the clusters with more than one particles (more
% than one particle centers). Use others for el calculation.
% OUTPUT:
% - As:     the list of areas
% - el:     the elongation ratio
% - ellist: the list of all elongation ratios
% - nda:    the average nearest distances
% - nd:     the list of all nearest distances
% FUNCTION USED:
% faster_elongation.m
%% Task I: Calculate the nd and nda directly from the Clist
cenno = size(Clist,1); % center number
nd = [];
for ii = 1:1:cenno

    % Generate a list repeat the chosen center N times
    expand_c = repmat( Clist(ii,:) , [cenno , 1] );

    % Distance calculation between the points on the chosen center and 
    % all centers. Then delete one "0".
    distances = (Clist - expand_c).^2;
    distances = sum( distances , 2);
    distances = distances.^0.5;
    distances = sort(distances);
    distances = distances( 2:length(distances) );

    nd = [nd; min(distances)];

end

% Calculate nda
nda = mean(nd);
disp('2D characterization: Task 1 (out of 2) is done');
%% Task II: Calculate el
Bimg2 = Bimg;
L = length(Bimg);
Bimg3 = zeros(L,L); % Image for calculate el. Single particle image.
for ii = 1:1:cenno
    Bimg2( Clist(ii,1) , Clist(ii,2) ) = 2; % center marked with 2
end

Bimg = bwlabel(Bimg); % Bimg become a colored image.

cnt = max(max(Bimg));
count = 0; % the number of "single particle cluster"
% list = [];
for ii = 1:1:cnt
    
    if(ii>cnt/4 && ii<cnt/4+1); disp('25% of task 2 (out of 2) is done.'); end;
    if(ii>cnt/2 && ii<cnt/2+1); disp('50% of task 2 (out of 2) is done.'); end;
    if(ii>3*cnt/4 && ii<3*cnt/4+1); disp('75% of task 2 (out of 2) is done.'); end;
    
    temp_img = 1 - ceil( abs( Bimg - ii )/(cnt + 1) );
    compare_img1 = temp_img .* ceil( Bimg/(cnt + 1) );
    compare_img2 = temp_img .* Bimg2;
    
    if abs( sum( sum(compare_img1) ) - sum( sum( compare_img2 ) ) ) == 1
        count = count+1;
        Bimg3 = Bimg3 + compare_img2;
%         list = [list;ii];
    end
    
end

[As] = area_stat( Bimg3 );

[el, ellist] = faster_elongation( Bimg3 );

disp('2D characterization is done')

