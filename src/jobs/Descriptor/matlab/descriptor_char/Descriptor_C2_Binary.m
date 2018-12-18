function Descriptor_C2_Binary(path_to_write,input_type)

% Descriptor-based characterization of the BINARY size microstructure image
% ------------------------------------------------------------------------- 
% Function used:
% overlap_particle_calc.m
% area_stat.m
% faster_elongation.m
% Transform.m
% -------------------------------------------------------------------------
% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%% Specify import function according to input option
switch input_type
    case 1
        img = imread([path_to_write,'/Input1.jpg']); % read the incming target and store pixel values
        if size(img) > 1
           img = double(round(img(:,:,1)/256));
        end
    case 2 
%         img = unzip([path_to_file,fname],[path_to_write,'/input']);
    case 3
        img = imread([path_to_write,'/Input1.jpg']); % read the incming target and store pixel values
        if size(img) > 1
           img = double(round(img(:,:,1)/256));
        end
end

if input_type ~= 2
    image = img;
    L1 = size(image,1); L2 = size(image,2); % get image size
    vf = sum( image(:) ) / (L1*L2);  % volume fraction

    [ ~, N, nd, areas, ellist ] = Characterization_2D_descriptor(image);

    rc_mean = sqrt( (L1*L2) * vf / N / pi ); % mean radius

    Els = 1./ellist; 

    %% added by akshay
    mean_nd = mean(nd);
    mean_asp =mean(Els);
    std_nd = std(nd);
    std_asp = std(Els); 
    mean_area = mean(areas);
    %% convert variables to tables
    Num_Clusters = array2table(N); Num_Clusters.Properties.VariableNames = {'Num_of_Clusters'};
    VF = array2table(vf); VF.Properties.VariableNames = {'Volume_Fraction'};
    Areas = array2table(areas); Areas.Properties.VariableNames = {'Area_of_Clusters'};
    Nearest_neighbor = array2table(nd); Nearest_neighbor.Properties.VariableNames = {'Nearest_Neighbor_distance'};
    Aspect_Ratio = array2table(Els); Aspect_Ratio.Properties.VariableNames = {'Aspect_Ratio'};
    Mean_Radius = array2table(rc_mean); Mean_Radius.Properties.VariableNames = {'Mean_Radius'};
    mean_nd = array2table(mean_nd); mean_nd.Properties.VariableNames = {'Mean_Nearest_Neighbor_distance'};
    mean_asp = array2table(mean_asp); mean_asp.Properties.VariableNames = {'Mean_Aspect_Ratio'};
    mean_area = array2table(mean_area); mean_area.Properties.VariableNames = {'Mean_Area_of_Clusters'};
    
    Cluster_data = cat(2,Areas,Nearest_neighbor,Aspect_Ratio);
    Image_data = cat(2,VF,Num_Clusters,Mean_Radius,mean_nd,mean_asp,mean_area);
    
    writetable(Cluster_data,[path_to_write,'/Cluster_data.csv']);
    writetable(Image_data,[path_to_write,'/Image_data.csv']);
    % save_path = strcat(path_to_write,'/ch_result.mat');
    % save(save_path);
else
    zip_file_processing(path_to_write);
end
end