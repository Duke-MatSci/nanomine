function SDFRecon(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name,NumOfRecon,phase_cords)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%% Changes
% Otsu
% Odd shape fix
% Select Phase
rc=0;
try
    path_to_read = [jobSrcDir,'/'];
    path_to_write = [jobSrcDir,'/output'];
    mkdir(path_to_write);
    
    writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists
    
    %% Specify import function according to input option
    condition=1; % for phase selection
    try
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
                unzip([path_to_read,file_name],[path_to_write,'/input']);
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
    catch
        writeError([path_to_write, '/errors.txt'], ['Failed to read image file']);
    end
    
    if str2num(input_type) ~= 2
        %% SDF code - Shuangchen & Yichi
        % img_original - binary original image
        %% Umar added to check and binarize the image using Otsu
        if length(size(img)) > 2
            img_original = img(:,:,1);
        else
            img_original = img;
        end
        %% Umar added to deal with odd shaped images
        
        md=min(size(img_original));
        img_original=img_original(1:md,1:md);
        
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
        img=img_original;
        
        %% writing input file
        if str2num(input_type)==1
            if length(size(img)) > 2
                imwrite(img(:,:,1:3),[path_to_write,'/','Input1.jpg'])
                
            else
                imwrite(img,[path_to_write,'/','Input1.jpg'])
            end
        else 
            imwrite(256*img,[path_to_write,'/','Input1.jpg']);
             
         end
        %%
        img_original = double(img_original);
        vf = mean(img_original(:));
        pixel = size(img_original,1);
        sdf2d = fftshift(abs(fft2(img_original-vf)).^2); % 2D sdf
        sdf1d = FFT2oneD(sdf2d); % 1D sdf ** removed transpose to make it a coloumn vector **
        S2_target = evaluate(img_original);
        csvwrite([path_to_write,'/Input_SDF_2D.csv'],sdf2d);
        csvwrite([path_to_write,'/Input_SDF_1D.csv'],sdf1d);
        
        % plot 2d SDF and save image
        figure('color',[1,1,1])
        hold on;
        clims = [5e3 5e4];
        map = [0.0, 0, 0
            1.0, 0.5, 0
            1.0, 1.0, 0
            1.0, 0, 0];
        imagesc(sdf2d,clims); colormap(map);
        xlim([0 size(img_original,1)]); ylim([0 size(img_original,2)]);
        set(gca,'xtick',[]); set(gca,'ytick',[]);
        saveas(gcf,[path_to_write,'/SDF_2D.jpg']);
        hold off;
        % create the required number of reconstructions
        S2_recon = zeros(length(S2_target),str2num(NumOfRecon));
        for ii = 1 : str2num(NumOfRecon)
            img_recon = Microstructure_generator(sdf1d', 'custom', vf, pixel);
            imwrite(256*img_recon,[path_to_write,'/Reconstruct',num2str(ii),'.jpg']); % write reconstructed image
            % Compute auto-corrrelation for reconstructions
            S2_recon(:,ii) = evaluate(img_recon);
        end
        S2_all = cat(2,S2_target,S2_recon);
    else
        S2_all = zip_file_processing_SDFrecon(path_to_write,str2num(NumOfRecon));
    end
    
    % Plot correlation comparison
    figure('color',[1,1,1])
    hold on;
    
    for i = 1 : str2num(NumOfRecon)+1
        plot(0:1:length(S2_all(:,i))-1, S2_all(:,i) , 'LineWidth',2.5);
        if i==1
            legendInfo{i} = 'Input Image';
            if str2num(input_type) == 2
                legendInfo{i} = 'Mean of Input Images';
            end
        else
            legendInfo{i} = ['Reconstruction #',num2str(i-1)]; % for variable name in table
        end
        hold on;
    end
    
    xlabel('Distance (Pixel)');
    ylabel('Autocorrelation Function');
    box on;
    legend(legendInfo);
    saveas(gcf,[path_to_write,'/','Autocorrelation_comparison.jpg']);
    hold off;
    
    
    %% ZIP files %%
    zip([path_to_write,'/Results.zip'],{'*'},path_to_write);
    
catch ex
    rc = 99;
    exit(rc);
end
    function writeError(file, msg)
        f = fopen(file,'a+');
        fprintf(f, '%s\n', msg);
        fclose(f);
    end
end
