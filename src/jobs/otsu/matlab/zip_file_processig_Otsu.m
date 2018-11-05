function zip_file_processig_Otsu(path_to_write)

    path_to_unzip_files = [path_to_write,'/input'];

    images = dir([path_to_unzip_files]);

    num_images = length(images)-2;

    for i = 1 : num_images
        img = imread([path_to_unzip_files,'/',images(i+2).name]);
        imwrite(img,[path_to_write,'/','Input',num2str(i),'.jpg']);
        if length(size(img)) > 2
           img = img(:,:,1);
        end
        Target = double(img);
        Target = Target/256; % convert to grayscale
        % Otsu Method
        level = graythresh(Target);
        Target_binarized = im2bw(Target,level);
        %Save binarized image
        imwrite(Target_binarized,[path_to_write,'/','Binarized_Input',num2str(i),'.jpg']);
        % record data to be written in CSV file
        input_name{i,1} = images(i+2).name; % name of input file processed in i'th loop
        renamed_image{i,1} = ['Input',num2str(i),'.jpg']; % file is renamed according to order of processing
        binarized_image{i,1} = ['Binarized_Input',num2str(i),'.jpg']; % binarized image name
        vol_fr(i,1) = mean(Target_binarized(:));
    end
    %write CSV file matching input -> output file names and corresponding
    %vol_fr

    % create  a struct element S to stor eit
    S.Input_Image = cellstr(input_name);
    S.Processed_As = renamed_image;
    S.Binarized_Image = binarized_image;
    S.Volume_Fraction = vol_fr;

    T = struct2table(S'); % convert to table for writing
    % write CSV file
    writetable(T,[path_to_write,'/Batch_data.csv']);
end
