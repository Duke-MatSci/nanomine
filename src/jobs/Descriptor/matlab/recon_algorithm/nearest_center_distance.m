function [nda, ndf, nd] = nearest_center_distance(image)
%--------------------------------------------------------------------------
% Hongyi Xu, IDEAL Lab, Mechanical Engineering, Northwestern University
% This function is to calculate the nearest distance between cluster 
% centers.

% INPUT: 
% 2D image, any binary image, background should be 0;
% OUTPUT: 
% nda, the nearest distance on Average.
% ndf, the nearest distance appears with the highest Frequency. It is
% actually the average value of the highest bin in the histogram
%--------------------------------------------------------------------------
image = double(image); % Binary image! Background is 0!
image = ceil(image./1000);
img = bwlabel(image);
% clear image
ClusterNo = max(max(img));

if ClusterNo > 1
    nd = [];
    Center_list = [];   % List all the cluster centers coordinates in a N*2 matrix

    % Obtain the center location of each cluster
    
    cc = regionprops(img,'Centroid'); % cc is the cluster center
    for ii = 1:1:ClusterNo
        Center_list = [Center_list; cc(ii).Centroid];
    end
    
    clear ii

    for ii = 1:1:ClusterNo
        
        % Generate a list repeat the chosen center N times
        expand_c = repmat( Center_list(ii,:) , [ClusterNo , 1] );

        % Distance calculation between the points on the chosen center and 
        % all centers. Then delete one "0".

        distances = (Center_list - expand_c).^2;
        distances = sum( distances , 2);
        distances = distances.^0.5;
        distances = sort(distances);
        distances = distances( 2:length(distances) );

        nd = [nd; min(distances)];

    end

    % Calculate nda
    nda = mean(nd);

    % Calculate ndf
    nd_L = length(nd);
    [ num , bin_centers ] = hist(nd);
    bin_width = bin_centers(2) - bin_centers(1);
    [~,loc] = find( num == max(num) );
    bin_num = length(num);

    while length(loc) ~= 1
        bin_num = bin_num - 1;
        [ num , bin_centers ] = hist(nd , bin_num);
        bin_width = bin_centers(2) - bin_centers(1);
        [~,loc] = find( num == max(num) );
    end


    temp_sum = 0;
    temp_cnt = 0;
    for ii = 1:1:nd_L
        if ( nd(ii) >= bin_centers(loc) - bin_width/2 ) && ( nd(ii) <= bin_centers(loc) + bin_width/2 )
            temp_sum = temp_sum + nd(ii);
        end
    end
    ndf = temp_sum/num(loc);
end

if ClusterNo <= 1
    nda = NaN;
    ndf = NaN;
end