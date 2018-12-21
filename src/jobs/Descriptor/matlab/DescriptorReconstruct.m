function DescriptorReconstruct(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name)
% function MAIN(img_name, type, cutL, VF, recon_length, scale, visualize_fine_recon, visualize_coarse_recon, workingdir)
%
% This package is developed by Hongyi Xu, Northwestern University
% PI: Prof. Wei Chen, Northwestern University
% Contact: hongyixu2014@u.northwestern.edu
% Modified for NANOMINE by: Akshay Iyer; 6th Dec. 2018

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
rc=0;
try
    path_to_read = [jobSrcDir,'/'];
    path_to_write = [jobSrcDir,'/output'];
    mkdir(path_to_write);
    %% Specify import function according to input option
    switch str2num(input_type)
        case 1
            img = imread([path_to_read,file_name]); % read the incming target and store pixel values

            if size(img) > 1
                img_original = img(:,:,1);
        else
            img_original = img;
            end
            if max(img_original(:)) > 1
                img_original = round(img_original/256);
            imwrite(img,[path_to_write,'/','Input.jpg'])
        else
            imwrite(256*img,[path_to_write,'/','Input.jpg'])
            end
        case 2 
            unzip([path_to_read,file_name],[path_to_write,'/input']);
        case 3
            load([path_to_read,file_name]);
            img_original = Input;
            imwrite(256*img_original,[path_to_write,'/','Input.jpg']);
    end

    %% Define useful variables as required by package %%
    img = img_original;
    type = 0; % this webtool is for binary images only
    cutL = size(img_original,1);
    VF = mean(img_original(:));
    recon_length = size(img_original,1); % size of reconstructed volume : recon_length-by-recon_length-by-recon_length
    scale = 50; % for a 50-by-50-by-50 coarse reconstruction needed for FEA
    visualize_fine_recon = 0;
    visualize_coarse_recon = 0;
    workingdir = path_to_write;
    addpath('./recon_algorithm'); addpath(workingdir);
    %cd('./recon_algorithm')  % go to the working directory

    %% II: Characterization. User-operation required (2 out of 2)
    if type == 0 % if it is a binary image

        Descriptor_C2_Binary(path_to_write,img, VF, recon_length)

    else  % If it is a greyscale image

        % Step 1: image preprocessing
        Descriptor_C1(img, VF, cutL);

        % ------------------------- IMAGEJ Operation ------------------------------
        % Step 2: operating imageJ (following the manual). IMAGEJ OPERATION NEEDED.
        disp('Do NOT clost MATLAB. Please keep it on and minimize the window.')
        disp('Then follow the manual to operate IMAGEJ.')
        disp('After generating "cllist.txt" in working directory,')
        disp('go back to MATLAB and press anykey to continue...')
        pause
        % -------------------------------------------------------------------------

        % Step 3: 2D characterization and 3D prediction
        Descriptor_C2(img, VF, recon_length);

    end

    %% III: Reconstruction
    %cd('./recon_algorithm')  % go to the working directory
    img_name = [path_to_write,'/Input'];
    load( [ img_name, '_GB_double_filter_3D_results.mat' ] ); % Load characterization results, which include a variable "name" (= img_name)
    clearvars -except  img_original path_to_write Job_ID user_name num_recon name  recon_length  VF  N  num_3D ND3D  Predict_3D_As_mean  Predict_3D_As_var scale  visualize_fine_recon  visualize_coarse_recon  type % only keep the useful variables

    % Start microstrutcure reconstruction
    name_3D = [name, '_3D_recon'];
    Descriptor_Recon_3D(name_3D, recon_length, VF, round(num_3D), ND3D, Predict_3D_As_mean, Predict_3D_As_var);

    clearvars -except  img_original path_to_write Job_ID user_name num_recon name  name_3D  scale  visualize_fine_recon  visualize_coarse_recon  type  img_name 
    clc


    %% IV: Rescale the large reconstruction into a small one
    % Here the 300x300x300 is rescaled into a smaller 60x60x60 structure (for FEA)
    load( [name_3D, '.mat'] )
    % clear -except  name img  img_original scale  visualize_fine_recon  visualize_coarse_recon

    %[ img_coarse, Bimg_coarse ] = fine2coarse(img, scale);
    %save( [ name, '_coarsen_recon.mat'], 'img_coarse', 'Bimg_coarse' )

    % 
    %% VII: Visualization
    if visualize_coarse_recon == 1
        cord = ThreeD2Coordinate(Bimg_coarse);
        figure('color',[1,1,1]);
        voxel_image( cord, 1, 'g', 0.5, 'b' ); 
        axis equal
        box on
        L = length(Bimg_coarse);
        axis([1 L 1 L 1 L])
        view([1,0.5,0.5])
        saveas(gcf,[path_to_write,'/Coarse_recon.jpg']);
        saveas(gcf,[path_to_write,'/Coarse_recon.fig']);
    end

    if visualize_fine_recon == 1
        cord = ThreeD2Coordinate(img);
        figure('color',[1,1,1]);
        voxel_image( cord, 1, 'g', 0.5, 'b' ); 
        axis equal
        box on
        L = length(img);
        axis([1 L 1 L 1 L])
        view([1,0.5,0.5])
        saveas(gcf,[path_to_write,'/Fine_recon.jpg']);
    end

    % plot correlation 
    Plot_Correlation(img_original, img, path_to_write);
    %  clc
    disp('The 3D descriptor-based C&R is completed!')

    % delete unwanted files
    cd(path_to_write);
    delete Input_GB_double_filter_3D_results.mat;
    delete Input_GB_double_filter_2D_results.mat;
    %% ZIP files %%
    zip([path_to_write,'/Results.zip'],{'*'},path_to_write);

catch ex
  rc = 99;
  exit(rc);
end
end