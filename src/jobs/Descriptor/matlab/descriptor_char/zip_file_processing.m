function zip_file_processing(path_to_write)

path_to_unzip_files = [path_to_write,'/input'];

images = dir([path_to_unzip_files]);

num_images = length(images)-2;

batch_avg_vf = 0; % accumulate property here to get avg. of all images provided in zip file
batch_avg_num_clusters = 0;
batch_avg_mean_radius = 0;
batch_avg_mean_area = 0;
batch_avg_mean_asp = 0;
batch_avg_mean_nd = 0;

for i = 1 : num_images
    image = imread([path_to_unzip_files,'/',images(i+2).name]); % read image
    if i ==1
        imwrite(image,[path_to_write,'/','Input',num2str(i),'.jpg']); % save image with modified name
    end
    input_name = images(i+2).name; % name of input file processed in ith loop 
    newFolder = [path_to_write,'/Input',num2str(i)]; % create new directory for each input image and write its files
    mkdir(newFolder);
    
    if length(size(image)) > 3
            imwrite(image(:,:,1:3),[newFolder,'/','Input',num2str(i),'.jpg']);
    else
            imwrite(image,[newFolder,'/','Input',num2str(i),'.jpg']); % save image with modified name
    end
    
    
    if length(size(image)) > 2
       image = image(:,:,1);
    end
%% Umar edded to binarize
if max(image(:))>1
    Target = double(image);
    Target = Target/256; %
    level = graythresh(Target);
    image = im2bw(Target,level);
    
end
%%   
%     if (max(max(image))) > 1
%      image = double(round(image/256));
%     end
    
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
    Img_name = cell2table(cellstr(input_name)); Img_name.Properties.VariableNames = {'Image_name'};
    Num_Clusters = array2table(N); Num_Clusters.Properties.VariableNames = {'Num_of_Clusters'};
    VF = array2table(vf); VF.Properties.VariableNames = {'Volume_Fraction'};
    Areas = array2table(areas); Areas.Properties.VariableNames = {'Area_of_Clusters'};
    Nearest_neighbor = array2table(nd); Nearest_neighbor.Properties.VariableNames = {'Nearest_Neighbor_distance'};
    Aspect_Ratio = array2table(Els); Aspect_Ratio.Properties.VariableNames = {'Aspect_Ratio'};
    Mean_Radius = array2table(rc_mean); Mean_Radius.Properties.VariableNames = {'Mean_Radius'};
    Mean_nd = array2table(mean_nd); Mean_nd.Properties.VariableNames = {'Mean_Nearest_Neighbor_distance'};
    Mean_asp = array2table(mean_asp); Mean_asp.Properties.VariableNames = {'Mean_Aspect_Ratio'};
    Mean_area = array2table(mean_area); Mean_area.Properties.VariableNames = {'Mean_Area_of_Clusters'};
    
    Cluster_data = cat(2,Areas,Nearest_neighbor,Aspect_Ratio);
    Image_data = cat(2,Img_name,VF,Num_Clusters,Mean_Radius,Mean_nd,Mean_asp,Mean_area);
    
    writetable(Cluster_data,[newFolder,'/Cluster_data_Input',num2str(i),'.csv']);
    writetable(Image_data,[newFolder,'/Image_data_Input',num2str(i),'.csv']);

    % accumulate all image_data variables to calculate batch avg. (i.e.
    % avgfor all images supplied in zip file)
    batch_avg_vf = batch_avg_vf + vf;
    batch_avg_num_clusters = batch_avg_num_clusters + N;
    batch_avg_mean_radius = batch_avg_mean_radius + rc_mean;
    batch_avg_mean_area = batch_avg_mean_area + mean_area;
    batch_avg_mean_asp = batch_avg_mean_asp + mean_asp;
    batch_avg_mean_nd = batch_avg_mean_nd + mean_nd;
    
end

% calculate averages and save in table
batch_avg_vf = array2table(batch_avg_vf/num_images); batch_avg_vf.Properties.VariableNames = {'Avg_Volume_fraction'};
batch_avg_num_clusters = array2table(batch_avg_num_clusters/num_images); batch_avg_num_clusters.Properties.VariableNames = {'Avg_Num_of_Clusters'};
batch_avg_mean_radius = array2table(batch_avg_mean_radius/num_images); batch_avg_mean_radius.Properties.VariableNames = {'Mean_Radius'};
batch_avg_mean_area = array2table(batch_avg_mean_area/num_images); batch_avg_mean_area.Properties.VariableNames = {'Mean_Area_of_Clusters'}; 
batch_avg_mean_asp = array2table(batch_avg_mean_asp/num_images); batch_avg_mean_asp.Properties.VariableNames = {'Mean_Aspect_Ratio'}; 
batch_avg_mean_nd = array2table(batch_avg_mean_nd/num_images); batch_avg_mean_nd.Properties.VariableNames = {'Mean_Nearest_Neighbor_distance'}; 
num_images = array2table(num_images); num_images.Properties.VariableNames = {'Num_of_Images'};
% save batch average file
Batch_data = cat(2,num_images,batch_avg_vf,batch_avg_num_clusters,batch_avg_mean_radius,batch_avg_mean_nd,batch_avg_mean_asp,batch_avg_mean_area);
writetable(Batch_data,[path_to_write,'/Batch_data.csv']);

end