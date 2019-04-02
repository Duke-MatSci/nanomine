function[er]= zip_file_processing_SDFchar(path_to_write)

path_to_unzip_files = [path_to_write,'/input'];

images = dir([path_to_unzip_files]);

num_images = length(images)-2;
er=0;
for i = 1 : num_images
    try
        img = imread([path_to_unzip_files,'/',images(i+2).name]);
    catch
        er = 1;
        exit()
    end
    newFolder = [path_to_write,'/Input',num2str(i)]; mkdir(newFolder); % create a new folder for each input image
    
    if length(size(img)) > 2
        img_original = img(:,:,1);
    end
    %% Umar added to check and binarize the image using Otsu 02/27/2019
    if max(img_original(:))>1
        Target = double(img_original);
        Target = Target/256; %
        level = graythresh(Target);
        img_original = im2bw(Target,level);
    end
    %%
    if i==1
        imwrite(256*img_original,[path_to_write,'/','Input',num2str(i),'.jpg']);
    end
    %% SDF code - Shuangchen & Yichi
    % img_original - binary original image
    img_original = double(img_original);
    vf = mean(img_original(:));
    % pixel = size(img_original,1);
    sdf2d = fftshift(abs(fft2(img_original-vf)).^2); % 2D sdf
    sdf1d = FFT2oneD(sdf2d); % 1D sdf ** removed transpose to make it a coloumn vector **
    
    csvwrite([newFolder,'/SDF_2D.csv'],sdf2d);
    csvwrite([newFolder,'/SDF_1D.csv'],sdf1d);
    
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
    saveas(gcf,[newFolder,'/SDF_2D.jpg']);
    hold off;
    
    % create arrays to store 1d and 2d Sdfs of all images
    if i == 1
        sdf2d_all = zeros(size(sdf2d,1),size(sdf2d,2),num_images);
        sdf1d_all = zeros(size(sdf1d,1),num_images);
    end
    sdf2d_all(:,:,i) = sdf2d; sdf1d_all(:,i) = sdf1d; % copy SDFs in respective array
end
% compute mean and write in file
sdf2d_mean = mean(sdf2d_all,3);
sdf1d_mean = mean(sdf1d_all,1);
csvwrite([path_to_write,'/SDF_2D_mean.csv'],sdf2d_mean);
csvwrite([path_to_write,'/SDF_1D_mean.csv'],sdf1d_mean);
figure('color',[1,1,1])
hold on;
clims = [5e3 5e4];
map = [0.0, 0, 0
    1.0, 0.5, 0
    1.0, 1.0, 0
    1.0, 0, 0];
imagesc(sdf2d_mean,clims); colormap(map);
xlim([0 size(img_original,1)]); ylim([0 size(img_original,2)]);
set(gca,'xtick',[]); set(gca,'ytick',[]);
saveas(gcf,[path_to_write,'/SDF_2D.jpg']);
hold off;
end