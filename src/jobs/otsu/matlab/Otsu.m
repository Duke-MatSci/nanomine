function Otsu(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name)
  function writeError(file, msg)
    f = fopen(file,'a+');
    fprintf(f, '%s\n', msg);
    fclose(f);
  end

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%

rc = 0;
try 
    path_to_read = [jobSrcDir,'/'];
    path_to_write = [jobSrcDir,'/output'];
    mkdir(path_to_write);
    writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists
    try
      % %% Specify import function according to input option
      switch str2num(input_type)
          case 1
                img = imread([path_to_read,file_name]); % read the incoming target and store pixel values
                if size(img) > 1
                    imwrite(img(:,:,1),[path_to_write,'/','Input1.jpg'])
                else
                    writeError([path_to_write, '/errors.txt'], ['failed to read image file: ', file_name]);
                    rc = 97
                    exit(rc)
                end
          case 2
              img = unzip([path_to_read,file_name],[path_to_write,'/input']);
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
              imwrite(img,[path_to_write,'/','Input1.jpg']);
      end

      if str2num(input_type) ~= 2
          if length(size(img)) > 2
             img = img(:,:,1);
          end
          Target = double(img);
          Target = Target/256; % convert to grayscale
          % Otsu Method
          level = graythresh(Target);
          Target_binarized = im2bw(Target,level);
          %Save binarized image
          imwrite(Target_binarized,[path_to_write,'/','Binarized_Input1.jpg']);
          % record data to be written in CSV file
          input_name{1,1} = file_name; % name of input file processed in i'th loop
          renamed_image{1,1} = 'Input1.jpg'; % file is renamed according to order of processing
          binarized_image{1,1} = 'Binarized_Input1.jpg'; % binarized image name
          vol_fr(1,1) = mean(Target_binarized(:));
          % create  a struct element S to stor eit
          S.Input_Image = cellstr(input_name);
          S.Processed_As = renamed_image;
          S.Binarized_Image = binarized_image;
          S.Volume_Fraction = vol_fr;
          T = struct2table(S'); % convert to table for writing
          % write CSV file
          writetable(T,[path_to_write,'/Image_data.csv']);
      else
         zip_file_processig_Otsu(path_to_write);
      end
    catch ex
      rc = 98;
      msg = getReport(ex);
      writeError([path_to_write, '/errors.txt'], msg);
      writeError([path_to_write, '/errors.txt'], sprintf('\n'));
      exit(rc);
    end
catch ex
    msg = getReport(ex);
    % cannot write to output directory, so just display the error
    disp(msg);
    rc = 99;
    exit(rc);
end
end

