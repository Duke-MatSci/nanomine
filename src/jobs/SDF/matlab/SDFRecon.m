function SDFRecon(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name,NumOfRecon)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
%
rc=0;
try
    path_to_read = [jobSrcDir,'/'];
    path_to_write = [jobSrcDir,'/output'];
    mkdir(path_to_write);
    
    writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists
    
    %% Specify import function according to input option
    try
    switch str2num(input_type)
        case 1
            img = imread([path_to_read,file_name]); % read the incming target and store pixel values
            
            if length(size(img)) > 2
                img_original = img(:,:,1);
            else
                img_original = img;
            end
            if max(img_original(:)) > 1
                imwrite(img_original,[path_to_write,'/','Input1.jpg'])
                img_original = round(img_original/256);
            else
                imwrite(256*img_original,[path_to_write,'/','Input1.jpg'])
            end
        case 2
            unzip([path_to_read,file_name],[path_to_write,'/input']);
        case 3
            load([path_to_read,file_name]);
            img_original = Input;
            imwrite(256*img_original,[path_to_write,'/','Input1.jpg']);
    end
    catch
       writeError([path_to_write, '/errors.txt'], ['Failed to read image file']); 
    end
    
    if str2num(input_type) ~= 2
        %% SDF code - Shuangchen & Yichi
        % img_original - binary original image
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
            if input_type == 2
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
