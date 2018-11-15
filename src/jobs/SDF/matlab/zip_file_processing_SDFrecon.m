function S2_all = zip_file_processing_SDFrecon(path_to_write,num_recon)
% function uses avg. SDF to create reconstructions and returns
% autocorrelation of target+reconstructed images
    path_to_unzip_files = [path_to_write,'/input'];

    images = dir([path_to_unzip_files]);

    num_images = length(images)-2;

    for i = 1 : num_images
        img = imread([path_to_unzip_files,'/',images(i+2).name]);
        newFolder = [path_to_write,'/Input',num2str(i)]; mkdir(newFolder); % create a new folder for each input image
        
        if length(size(img)) > 2
           img_original = img(:,:,1);
        end
        if max(img_original(:)) > 1
            img_original = round(img_original/256);
        end
        if i == 1
            imwrite(256*img_original,[path_to_write,'/','Input',num2str(i),'.jpg']); 
        end
        %% SDF code - Shuangchen & Yichi
        % img_original - binary original image
        img_original = double(img_original);
        vf = mean(img_original(:));
        pixel = size(img_original,1);
        sdf2d = fftshift(abs(fft2(img_original-vf)).^2); % 2D sdf
        sdf1d = FFT2oneD(sdf2d); % 1D sdf ** removed transpose to make it a coloumn vector **

        csvwrite([newFolder,'/SDF_2D.csv'],sdf2d);
        csvwrite([newFolder,'/SDF_1D.csv'],sdf1d);

        % plot 2d SDF and save image
        figure('color',[1,1,1])
        hold on;
        clims = [5000 20000];
        imagesc(sdf2d,clims);
        xlim([0 size(img_original,1)]); ylim([0 size(img_original,2)]);
        set(gca,'xtick',[]); set(gca,'ytick',[]);
        saveas(gcf,[newFolder,'/SDF_2D.jpg']);
        hold off;

        % create arrays to store 1d and 2d Sdfs of all images
        if i == 1
            sdf2d_all = zeros(size(sdf2d,1),size(sdf2d,2),num_images);
            sdf1d_all = zeros(size(sdf1d,1),num_images);
            S2_target_first = evaluate(img_original);
            S2_target = zeros(length(S2_target_first),num_images);
            S2_target(:,1) = S2_target_first;
        end
        sdf2d_all(:,:,i) = sdf2d; sdf1d_all(:,i) = sdf1d; % copy SDFs in respective array
        % compute autocorrelation for all input images
        if i > 1
            S2_target(:,i) = evaluate(img_original);
        end
    end
    % compute mean and write in file
    sdf2d_mean = mean(sdf2d_all,3);
    sdf1d_mean = mean(sdf1d_all,2);
    S2_target_mean = mean(S2_target,2);
    csvwrite([path_to_write,'/SDF_2D_mean.csv'],sdf2d_mean);
    csvwrite([path_to_write,'/SDF_1D_mean.csv'],sdf1d_mean);
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
    
    % create the required number of reconstructions using mean sdf1d
    S2_recon = zeros(length(S2_target),num_recon);
    for ii = 1 : num_recon
        img_recon = Microstructure_generator(sdf1d_mean', 'custom', vf, pixel);
        imwrite(256*img_recon,[path_to_write,'/Reconstruct',num2str(ii),'.jpg']); % write reconstructed image
        % compute autocorrelation for reconstructions
        S2_recon(:,ii) = evaluate(img_recon);
    end
    S2_all = cat(2,S2_target_mean,S2_recon);
end
