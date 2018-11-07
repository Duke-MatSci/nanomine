function SDFCharacterize(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name)

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
  switch input_type
      case 1
          img = imread([path_to_read,file_name]); % read the incming target and store pixel values
          if length(size(img)) > 3
              imwrite(img(:,:,1:3),[path_to_write,'/','Input1.jpg'])
          else
              imwrite(img,[path_to_write,'/','Input1.jpg'])
          end
      case 2
          unzip([path_to_read,file_name],[path_to_write,'/input']);
      case 3
          load([path_to_read,file_name]);
          img_original = Input;
          imwrite(256*img_original,[path_to_write,'/','Input1.jpg']);
  end

  if input_type ~= 2
      %% SDF code - Shuangchen & Yichi
      % img_original - binary original image

      if length(size(img)) > 2
         img_original = img(:,:,1);
      else
          img_original = img;
      end
      if max(img_original(:)) > 1
          img_original = round(img_original/256);
      end
      img_original = double(img_original);
      vf = mean(img_original(:));
      % pixel = size(img_original,1);
      sdf2d = fftshift(abs(fft2(img_original-vf)).^2); % 2D sdf
      sdf1d = FFT2oneD(sdf2d); % 1D sdf ** removed transpose to make it a coloumn vector **

      csvwrite([path_to_write,'/SDF_2D.csv'],sdf2d);
      csvwrite([path_to_write,'/SDF_1D.csv'],sdf1d);

      % plot 2d SDF and save image
      figure('color',[1,1,1])
      hold on;
      clims = [1e4 7e5];
      map = [0.0, 0, 0
           1.0, 0.5, 0
           1.0, 1.0, 0
           1.0, 0, 0];
      imagesc(sdf2d,clims); colormap(map);
      xlim([0 size(img_original,1)]); ylim([0 size(img_original,2)]);
      set(gca,'xtick',[]); set(gca,'ytick',[]);
      saveas(gcf,[path_to_write,'/SDF_2D.jpg']);
      hold off;
  else
      zip_file_processing_SDFchar(path_to_write);
  end

  %% ZIP files %%
  zip([path_to_write,'/Results.zip'],{'*'},path_to_write);
catch ex
  rc = 99;
  exit(rc);
end

end


