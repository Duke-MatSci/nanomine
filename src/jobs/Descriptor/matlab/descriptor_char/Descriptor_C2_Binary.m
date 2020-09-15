function[er]= Descriptor_C2_Binary(img,path_to_write,input_type,condition,conversion_factor)


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

er=0; % To out type of issue faced



%% Umar added to check and binarize the image using Otsu 02/27/2019
if input_type ~= 2
     if length(size(img)) > 2
            img = img(:,:,1);
        else
            img = img;
        end
    
    if max(img(:))>1
        Target = double(img);
        Target = Target/256; %
        level = graythresh(Target);
        img = im2bw(Target,level);
    end
    
     if condition==0
                img=abs(img-1);
     end
    %Umar commented out
    
    %% writing input file
        if input_type==1
            if length(size(img)) > 2
                imwrite(img(:,:,1:3),[path_to_write,'/','Input1.jpg'])
                
            else
                imwrite(img,[path_to_write,'/','Input1.jpg'])
            end
        else 
            imwrite(256*img,[path_to_write,'/','Input1.jpg']);
             
         end
    %% 
    image = img;
    L1 = size(image,1); L2 = size(image,2); % get image size
    vf = sum( image(:) ) / (L1*L2);  % volume fraction
    
    [ ~, N, nd, areas, ellist,intph ] = Characterization_2D_descriptor(image);
    
    rc_mean = sqrt( (L1*L2) * vf / N / pi ); % mean radius
    
    Els = 1./ellist;
    
    %% added by akshay
    mean_nd = mean(nd);
    mean_asp =mean(Els);
    std_nd = std(nd);
    std_asp = std(Els);
    mean_area = mean(areas);
    %% Converting as per the physical units
    mean_nd=mean_nd*conversion_factor;
    mean_area=mean_area*conversion_factor;
    rc_mean=rc_mean*conversion_factor;
    intph=intph*conversion_factor;
    areas=areas*conversion_factor;
    %% convert variables to tables
    Num_Clusters = array2table(N); Num_Clusters.Properties.VariableNames = {'Num_of_Clusters'};
    VF = array2table(vf); VF.Properties.VariableNames = {'Volume_Fraction'};
    Areas = array2table(areas); Areas.Properties.VariableNames = {'Area_of_Clusters'};
    %% line  umar added
    intph = array2table(intph); intph.Properties.VariableNames = {'Interphase_Length'};
    std_nd = array2table(std_nd); std_nd.Properties.VariableNames = {'Variance_Nearest_Neighbor_distance'};
    %%
    Nearest_neighbor = array2table(nd); Nearest_neighbor.Properties.VariableNames = {'Nearest_Neighbor_distance'};
    Aspect_Ratio = array2table(Els); Aspect_Ratio.Properties.VariableNames = {'Aspect_Ratio'};
    Mean_Radius = array2table(rc_mean); Mean_Radius.Properties.VariableNames = {'Mean_Radius'};
    mean_nd = array2table(mean_nd); mean_nd.Properties.VariableNames = {'Mean_Nearest_Neighbor_distance'};
    mean_asp = array2table(mean_asp); mean_asp.Properties.VariableNames = {'Mean_Aspect_Ratio'};
    mean_area = array2table(mean_area); mean_area.Properties.VariableNames = {'Mean_Area_of_Clusters'};
    
    Cluster_data = cat(2,Areas,Nearest_neighbor,Aspect_Ratio);
    Image_data = cat(2,VF,Num_Clusters,intph,Mean_Radius,mean_nd,std_nd,mean_asp,mean_area);
    
    % % % Umar commented out for testing
    writetable(Cluster_data,[path_to_write,'/Cluster_data.csv']);
    writetable(Image_data,[path_to_write,'/Image_data.csv']);
    % % % Umar end
    
    % save_path = strcat(path_to_write,'/ch_result.mat');
    % save(save_path);
    
    % % %Umar commented out
else
    try
        zip_file_processing(path_to_write);
    catch
        er=1;
    end
    
end
% % % %Umar end
end