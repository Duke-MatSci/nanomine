function DescriptorReconstruct(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name,phase_cords)
% function MAIN(img_name, type, cutL, VF, recon_length, scale, visualize_fine_recon, visualize_coarse_recon, workingdir)
%
% This package is developed by Hongyi Xu, Northwestern University
% PI: Prof. Wei Chen, Northwestern University
% Contact: hongyixu2014@u.northwestern.edu
% Modified for NANOMINE by: Akshay Iyer; 6th Dec. 2018
% Modified for NANOMINE by: Umar Farooq Ghumman; 11th Feb. 2019 (Added an upper limit for recon_length i.e. reconstruction size.
% Modified for NANOMINE by: Umar, 14th July 2020 (Added phase selection feature)
%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
rc=0;

%Umar comment
try
    %umar end
    
    path_to_read = [jobSrcDir,'/'];
    path_to_write = [jobSrcDir,'/output'];
    mkdir(path_to_write);
    %% Specify import function according to input option
    condition=1; % for phase selection
   switch str2num(input_type)
        case 1
            img = imread([path_to_read,file_name]); % read the incming target and store pixel values
            if length(size(img)) > 1
            phase_cords = split(phase_cords, '*');
            phase_cords = [str2num(phase_cords{1}) str2num(phase_cords{2})];
            if phase_cords(1)==0 & phase_cords(2) == 0
                condition=1;
            else
                [condition]=check_phase(img,phase_cords); % if 0 image needs to be inverted
            end
            else
                writeError([path_to_write, '/errors.txt'], ['failed to read image file: ', file_name]);
                rc = 97
                exit(rc)
            end    
        case 2
            img=unzip([path_to_read,file_name],[path_to_write,'/input']);
        case 3
            path=[path_to_read,file_name];
            k=load(path);
            [no_need,f_name,ext]=fileparts(file_name);
            try
                img = getfield(k,f_name);
            catch ex
                rc = 98;
                msg = getReport(ex);
                writeError([path_to_write, '/errors.txt'], 'The variable name inside the material file shold be the same as the name of the file. Technical details below:');
                
                writeError([path_to_write, '/errors.txt'], msg);
                writeError([path_to_write, '/errors.txt'], sprintf('\n'));
                exit(rc);
            end  
   end
   
   %%
   if length(size(img)) > 2
            img_original = img(:,:,1);
        else
            img_original = img;
   end
        
           %% Umar added to check and binarize the image using Otsu 02/27/2019
        if max(img_original(:))>1
            Target = double(img_original);
            Target = Target/256; %
            level = graythresh(Target);
            img_original = im2bw(Target,level);
        end
        
             if condition==0
                img_original=abs(img_original-1);
            end
   
   %% Define useful variables as required by package %%
    
    img = img_original;
    type = 0; % this webtool is for binary images only
    cutL = size(img_original,1);
    VF = mean(img_original(:));
    recon_length = size(img_original,1); % size of reconstructed volume : recon_length-by-recon_length-by-recon_length
    
    % setting an upper limit for recon_length
    if recon_length>200
        recon_length=200;
    end
    
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
    
    %% Umar comment
catch ex
    rc = 99;
    exit(rc);
    %% Umar end
end
end
